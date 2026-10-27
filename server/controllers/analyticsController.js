'use strict';
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { ok, badRequest, unauthorized, serverError, parseBody } = require('../utils/http');
const { verifyPassword, hashPassword } = require('../services/authService');
const { parseCookies } = require('../middleware/auth');

async function dashboard(req, res) {
  try {
    const db  = await getDb();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalProducts,
      inventoryVal,
      todaySales,
      lowStock,
      newProductsThisMonth,
    ] = await Promise.all([
      db.collection('products').countDocuments({ active: true }),
      db.collection('products').aggregate([
        { $match: { active: true } },
        { $group: { _id: null, val: { $sum: { $multiply: ['$stock', '$costPrice'] } } } },
      ]).toArray(),
      db.collection('sales').aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]).toArray(),
      db.collection('products').countDocuments({
        active: true,
        $expr: { $lte: ['$stock', '$reorderThreshold'] },
      }),
      db.collection('products').countDocuments({
        active: true,
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      }),
    ]);

    return ok(res, {
      totalProducts,
      inventoryValue: inventoryVal[0]?.val ?? 0,
      todayRevenue:   todaySales[0]?.revenue ?? 0,
      todayCount:     todaySales[0]?.count ?? 0,
      lowStockCount:  lowStock,
      newProductsThisMonth,
      revenueChangePositive: true,
      revenueChangeText: `${todaySales[0]?.count ?? 0} sale${todaySales[0]?.count !== 1 ? 's' : ''} today`,
    });
  } catch (err) {
    console.error('[dashboard.summary]', err);
    return serverError(res);
  }
}

async function trends(req, res) {
  try {
    const db      = await getDb();
    const cutoff  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const data    = await db.collection('sales').aggregate([
      { $match: { status: 'completed', createdAt: { $gte: cutoff } } },
      { $group: {
        _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        count:   { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', revenue: 1, count: 1 } },
    ]).toArray();
    return ok(res, data);
  } catch (err) {
    console.error('[dashboard.trends]', err);
    return serverError(res);
  }
}

async function alerts(req, res) {
  try {
    const db      = await getDb();
    const products = await db.collection('products').find({
      active: true,
      $expr: { $lte: ['$stock', '$reorderThreshold'] },
    }).sort({ stock: 1 }).limit(20).toArray();
    return ok(res, products);
  } catch (err) {
    console.error('[dashboard.alerts]', err);
    return serverError(res);
  }
}

async function salesReport(req, res) {
  try {
    const db  = await getDb();
    const url = new URL(req.url, 'http://localhost');
    const q   = url.searchParams;
    const filter = { status: 'completed' };
    if (q.get('dateFrom')) filter.createdAt = { ...filter.createdAt, $gte: new Date(q.get('dateFrom')) };
    if (q.get('dateTo'))   filter.createdAt = { ...filter.createdAt, $lte: new Date(q.get('dateTo') + 'T23:59:59Z') };

    const data = await db.collection('sales').aggregate([
      { $match: filter },
      { $group: {
        _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        count:   { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', revenue: 1, count: 1 } },
    ]).toArray();
    return ok(res, data);
  } catch (err) {
    console.error('[reports.sales]', err);
    return serverError(res);
  }
}

async function topProducts(req, res) {
  try {
    const db  = await getDb();
    const url = new URL(req.url, 'http://localhost');
    const q   = url.searchParams;
    const filter = { status: 'completed' };
    if (q.get('dateFrom')) filter.createdAt = { ...filter.createdAt, $gte: new Date(q.get('dateFrom')) };
    if (q.get('dateTo'))   filter.createdAt = { ...filter.createdAt, $lte: new Date(q.get('dateTo') + 'T23:59:59Z') };

    const data = await db.collection('sales').aggregate([
      { $match: filter },
      { $unwind: '$items' },
      { $group: {
        _id:          '$items.product',
        name:         { $first: '$items.productName' },
        sku:          { $first: '$items.sku' },
        totalQty:     { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.priceAtSale', '$items.quantity'] } },
      }},
      { $sort: { totalQty: -1 } },
      { $limit: 10 },
    ]).toArray();
    return ok(res, data);
  } catch (err) {
    console.error('[reports.topProducts]', err);
    return serverError(res);
  }
}

async function stockSummary(req, res) {
  try {
    const db = await getDb();
    const [summary] = await db.collection('products').aggregate([
      { $match: { active: true } },
      { $group: {
        _id:              null,
        totalProducts:    { $sum: 1 },
        totalStock:       { $sum: '$stock' },
        inventoryValue:   { $sum: { $multiply: ['$stock', '$costPrice'] } },
        lowStockCount:    { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$reorderThreshold'] }] }, 1, 0] } },
        outOfStockCount:  { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
      }},
    ]).toArray();
    return ok(res, summary || {});
  } catch (err) {
    console.error('[reports.stock]', err);
    return serverError(res);
  }
}

async function updateProfile(req, res) {
  try {
    const body = await parseBody(req);
    const name = (body.name || '').trim();
    if (!name || name.length < 2) {
      return badRequest(res, 'Name must be at least 2 characters');
    }
    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: req.user._id },
      { $set: { name, updatedAt: new Date() } }
    );
    const user = await db.collection('users').findOne(
      { _id: req.user._id },
      { projection: { passwordHash: 0 } }
    );
    return ok(res, { user });
  } catch (err) {
    console.error('[users.profile]', err);
    return serverError(res);
  }
}

async function changePassword(req, res) {
  try {
    const body = await parseBody(req);
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword || newPassword.length < 8)
      return badRequest(res, 'Invalid password data');

    const db   = await getDb();
    const user = await db.collection('users').findOne({ _id: req.user._id });
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return unauthorized(res, 'Current password is incorrect');

    const pwHash = await hashPassword(newPassword);
    await db.collection('users').updateOne(
      { _id: req.user._id },
      { $set: { passwordHash: pwHash, updatedAt: new Date() } }
    );
    // Invalidate all other sessions
    const token = parseCookies(req.headers.cookie)['sp_session'];
    if (token) {
      const crypto    = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db.collection('sessions').deleteMany({
        userId:    req.user._id,
        tokenHash: { $ne: tokenHash },
      });
    }
    return ok(res, { changed: true });
  } catch (err) {
    console.error('[users.password]', err);
    return serverError(res);
  }
}

module.exports = {
  dashboard, trends, alerts,
  salesReport, topProducts, stockSummary,
  updateProfile, changePassword,
};
