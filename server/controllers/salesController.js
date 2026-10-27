'use strict';
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const { getDb, getClient, hasReplicaSet } = require('../config/database');
const {
  ok, created, badRequest, notFound, serverError, parseBody,
} = require('../utils/http');

/** Generates a human-readable invoice number like INV-20261026-A3F9 */
function generateInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${date}-${rand}`;
}

async function list(req, res) {
  try {
    const db  = await getDb();
    const url = new URL(req.url, 'http://localhost');
    const q   = url.searchParams;

    const page     = Math.max(1, parseInt(q.get('page')  || '1'));
    const limit    = Math.min(100, parseInt(q.get('limit') || '20'));
    const skip     = (page - 1) * limit;
    const status   = q.get('status')   || '';
    const dateFrom = q.get('dateFrom') || '';
    const dateTo   = q.get('dateTo')   || '';

    const filter = {};
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [data, total] = await Promise.all([
      db.collection('sales').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('sales').countDocuments(filter),
    ]);
    return ok(res, data, { total, page, limit });
  } catch (err) {
    console.error('[sales.list]', err);
    return serverError(res);
  }
}

async function get(req, res, id) {
  try {
    if (!ObjectId.isValid(id)) return notFound(res);
    const db   = await getDb();
    const sale = await db.collection('sales').findOne({ _id: new ObjectId(id) });
    if (!sale) return notFound(res, 'Invoice not found');
    if (sale.createdBy) {
      const creator = await db.collection('users').findOne(
        { _id: sale.createdBy },
        { projection: { passwordHash: 0 } }
      );
      sale.createdBy = creator;
    }
    return ok(res, sale);
  } catch (err) {
    console.error('[sales.get]', err);
    return serverError(res);
  }
}

/**
 * Validates cart items, snapshots server-side prices, and creates a sale.
 *
 * When a MongoDB replica set is available (RS mode): uses a proper multi-document
 * transaction so all stock decrements and the sale insert are atomic.
 *
 * When running standalone (no RS): uses sequential findOneAndUpdate with an
 * atomic stock guard + compensation loop — this is NOT equivalent to a transaction
 * but prevents negative stock in normal operation.
 */
async function create(req, res) {
  try {
    const body = await parseBody(req);
    const { items, notes } = body;

    if (!Array.isArray(items) || items.length === 0)
      return badRequest(res, 'Cart is empty');

    const db  = await getDb();
    const now = new Date();

    // ── 1. Validate & snapshot all products BEFORE any writes ─────────────────
    const lineItems = [];
    for (const item of items) {
      if (!item.productId || !ObjectId.isValid(item.productId))
        return badRequest(res, 'Invalid productId in cart');
      const qty = parseInt(item.quantity);
      if (!qty || qty <= 0 || qty > 10000)
        return badRequest(res, 'Invalid quantity in cart item');

      const product = await db.collection('products').findOne({
        _id: new ObjectId(item.productId),
        active: true,
      });
      if (!product)
        return badRequest(res, `Product not found: ${item.productId}`);
      if (product.stock < qty)
        return badRequest(
          res,
          `Insufficient stock for "${product.name}". Available: ${product.stock}`,
          { insufficientStock: true }
        );

      lineItems.push({
        productId:   product._id,
        productName: product.name,
        sku:         product.sku,
        priceAtSale: product.sellingPrice, // server snapshot — never trust client
        quantity:    qty,
      });
    }

    // ── 2. Server-side totals (never trust client) ─────────────────────────────
    const subtotal = Math.round(lineItems.reduce((s, i) => s + i.priceAtSale * i.quantity, 0) * 100) / 100;
    const tax      = Math.round(subtotal * 0.18 * 100) / 100;
    const total    = Math.round((subtotal + tax) * 100) / 100;

    const saleItems = lineItems.map(i => ({
      product:     i.productId,
      productName: i.productName,
      sku:         i.sku,
      priceAtSale: i.priceAtSale,
      quantity:    i.quantity,
    }));

    const saleDoc = {
      invoiceNumber: generateInvoiceNumber(),
      items:     saleItems,
      subtotal,
      tax,
      total,
      notes:     (notes || '').trim(),
      status:    'completed',
      createdBy: req.user._id,
      createdAt: now,
      updatedAt: now,
    };

    // ── 3a. TRANSACTION PATH (replica set available) ───────────────────────────
    const rsAvailable = await hasReplicaSet();

    if (rsAvailable) {
      const client  = getClient();
      const session = client.startSession();
      let sale;
      try {
        await session.withTransaction(async () => {
          // All ops inside here are atomic
          for (const item of lineItems) {
            const result = await db.collection('products').findOneAndUpdate(
              { _id: item.productId, stock: { $gte: item.quantity }, active: true },
              { $inc: { stock: -item.quantity }, $set: { updatedAt: now } },
              { returnDocument: 'after', session }
            );
            if (!result) {
              // Abort entire transaction
              throw Object.assign(
                new Error(`Insufficient stock for "${item.productName}" (race condition)`),
                { statusCode: 400, insufficientStock: true }
              );
            }
            await db.collection('inventory_movements').insertOne({
              product:    item.productId,
              type:       'sale',
              quantity:   -item.quantity,
              stockAfter: result.stock,
              notes:      'Sale',
              createdBy:  req.user._id,
              createdAt:  now,
            }, { session });
          }
          const insertResult = await db.collection('sales').insertOne(saleDoc, { session });
          sale = await db.collection('sales').findOne({ _id: insertResult.insertedId }, { session });
        });
        return created(res, sale);
      } catch (txErr) {
        if (txErr.statusCode === 400) {
          return badRequest(res, txErr.message, { insufficientStock: !!txErr.insufficientStock });
        }
        throw txErr;
      } finally {
        await session.endSession();
      }
    }

    // ── 3b. STANDALONE PATH (compensating writes — no RS available) ───────────
    // NOTE: This is NOT equivalent to a transaction. If the process crashes between
    // stock decrement and sale insert, data may be inconsistent. Enable a replica
    // set for production-grade atomicity.
    const decremented = [];
    for (const item of lineItems) {
      const result = await db.collection('products').findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity }, active: true },
        { $inc: { stock: -item.quantity }, $set: { updatedAt: now } },
        { returnDocument: 'after' }
      );
      if (!result) {
        // Compensate already-decremented items
        for (const done of decremented) {
          await db.collection('products').updateOne(
            { _id: done.productId },
            { $inc: { stock: done.quantity }, $set: { updatedAt: now } }
          );
        }
        return badRequest(
          res,
          `Insufficient stock for "${item.productName}" (sold out during checkout)`,
          { insufficientStock: true }
        );
      }
      decremented.push(item);
      await db.collection('inventory_movements').insertOne({
        product:    item.productId,
        type:       'sale',
        quantity:   -item.quantity,
        stockAfter: result.stock,
        notes:      'Sale',
        createdBy:  req.user._id,
        createdAt:  now,
      });
    }

    const insertResult = await db.collection('sales').insertOne(saleDoc);
    const sale = await db.collection('sales').findOne({ _id: insertResult.insertedId });
    return created(res, sale);

  } catch (err) {
    if (err.statusCode) return badRequest(res, err.message);
    console.error('[sales.create]', err);
    return serverError(res);
  }
}

/** Cancels a completed sale and reverses stock. Uses a transaction when RS is available. */
async function cancel(req, res, id) {
  try {
    if (!ObjectId.isValid(id)) return notFound(res);
    const db   = await getDb();
    const _id  = new ObjectId(id);
    const sale = await db.collection('sales').findOne({ _id });
    if (!sale)                       return notFound(res, 'Invoice not found');
    if (sale.status === 'cancelled') return badRequest(res, 'Invoice is already cancelled');

    const now = new Date();
    const rsAvailable = await hasReplicaSet();

    const doCancel = async (session) => {
      const opts = session ? { session } : {};
      for (const item of sale.items || []) {
        const productId = item.product || item.productId;
        await db.collection('products').updateOne(
          { _id: productId },
          { $inc: { stock: item.quantity }, $set: { updatedAt: now } },
          opts
        );
        await db.collection('inventory_movements').insertOne({
          product:    productId,
          type:       'adjustment',
          quantity:   item.quantity,
          stockAfter: null, // stale but logged
          notes:      `Cancellation of ${sale.invoiceNumber}`,
          createdBy:  req.user._id,
          createdAt:  now,
        }, opts);
      }
      await db.collection('sales').updateOne(
        { _id },
        { $set: { status: 'cancelled', cancelledAt: now, updatedAt: now } },
        opts
      );
    };

    if (rsAvailable) {
      const session = getClient().startSession();
      try {
        await session.withTransaction(() => doCancel(session));
      } finally {
        await session.endSession();
      }
    } else {
      await doCancel(null);
    }

    return ok(res, { cancelled: true });
  } catch (err) {
    console.error('[sales.cancel]', err);
    return serverError(res);
  }
}

module.exports = { list, get, create, cancel };
