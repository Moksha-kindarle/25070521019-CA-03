'use strict';
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { ok, badRequest, serverError, parseBody } = require('../utils/http');
const { validateAdjustment } = require('../validators');

async function movements(req, res) {
  try {
    const db  = await getDb();
    const url = new URL(req.url, 'http://localhost');
    const q   = url.searchParams;

    const page   = Math.max(1, parseInt(q.get('page')  || '1'));
    const limit  = Math.min(100, parseInt(q.get('limit') || '20'));
    const skip   = (page - 1) * limit;
    const type   = q.get('type')   || '';
    const search = q.get('search') || '';

    const filter = {};
    if (type) filter.type = type;

    let pipeline = [
      { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: '_p' } },
      { $addFields: { product: { $arrayElemAt: ['$_p', 0] } } },
      { $project: { _p: 0 } },
    ];
    if (search) {
      pipeline.unshift({
        $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: '_ps' }
      });
      pipeline = [
        { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: '_ps' } },
        { $match: { ...filter, '$expr': { $regexMatch: { input: { $toString: { $arrayElemAt: ['$_ps.name', 0] } }, regex: search, options: 'i' } } } },
        { $addFields: { product: { $arrayElemAt: ['$_ps', 0] } } },
        { $project: { _ps: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ];
    } else {
      pipeline = [
        { $match: filter },
        { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: '_p' } },
        { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: '_u' } },
        { $addFields: {
          product:   { $arrayElemAt: ['$_p', 0] },
          createdBy: { $arrayElemAt: ['$_u', 0] },
        }},
        { $project: { _p: 0, _u: 0, 'createdBy.passwordHash': 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ];
    }

    const [data, total] = await Promise.all([
      db.collection('inventory_movements').aggregate(pipeline).toArray(),
      db.collection('inventory_movements').countDocuments(filter),
    ]);
    return ok(res, data, { total, page, limit });
  } catch (err) {
    console.error('[inventory.movements]', err);
    return serverError(res);
  }
}

async function adjust(req, res) {
  try {
    const body   = await parseBody(req);
    const errors = validateAdjustment(body);
    if (errors.length) return badRequest(res, errors[0], { errors });

    const db  = await getDb();
    if (!ObjectId.isValid(body.productId)) return badRequest(res, 'Invalid productId');
    const productId = new ObjectId(body.productId);

    const product = await db.collection('products').findOne({ _id: productId, active: true });
    if (!product) return badRequest(res, 'Product not found');

    const qty     = Number(body.quantity);
    const type    = body.type;
    let stockDelta;
    let stockAfter;

    if (type === 'stock-in') {
      stockDelta = qty;
    } else if (type === 'stock-out') {
      if (product.stock < qty) return badRequest(res, `Insufficient stock. Available: ${product.stock}`);
      stockDelta = -qty;
    } else { // adjustment — treat as absolute delta based on sign
      stockDelta = qty; // always additive for adjustments (user can enter negative via notes)
    }

    stockAfter = product.stock + stockDelta;
    if (stockAfter < 0) return badRequest(res, 'Stock cannot go below 0');

    await db.collection('products').updateOne(
      { _id: productId },
      { $set: { stock: stockAfter, updatedAt: new Date() } }
    );

    const movement = {
      product:    productId,
      type,
      quantity:   stockDelta,
      stockAfter,
      notes:      (body.notes || '').trim(),
      createdBy:  req.user._id,
      createdAt:  new Date(),
    };
    await db.collection('inventory_movements').insertOne(movement);

    return ok(res, { stockAfter, movement });
  } catch (err) {
    if (err.statusCode) return badRequest(res, err.message);
    console.error('[inventory.adjust]', err);
    return serverError(res);
  }
}

module.exports = { movements, adjust };
