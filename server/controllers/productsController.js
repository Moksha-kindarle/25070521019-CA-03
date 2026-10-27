'use strict';
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { ok, created, badRequest, notFound, conflict, serverError, parseBody, unauthorized } = require('../utils/http');
const { validateProduct } = require('../validators');

async function list(req, res) {
  try {
    const db  = await getDb();
    const url = new URL(req.url, 'http://localhost');
    const q   = url.searchParams;

    const page    = Math.max(1, parseInt(q.get('page')  || '1'));
    const limit   = Math.min(100, parseInt(q.get('limit') || '20'));
    const skip    = (page - 1) * limit;
    const search  = q.get('search')   || '';
    const catId   = q.get('category') || '';
    const stock   = q.get('stock')    || '';
    const sortBy  = ['name','stock','sellingPrice','costPrice','createdAt'].includes(q.get('sortBy')) ? q.get('sortBy') : 'createdAt';
    const sortDir = q.get('sortDir') === 'asc' ? 1 : -1;

    const filter = { active: true };
    if (search) filter.$text = { $search: search };
    if (catId && ObjectId.isValid(catId)) filter.category = new ObjectId(catId);
    if (stock === 'out') filter.stock = 0;
    else if (stock === 'low') filter.$expr = { $lte: ['$stock', '$reorderThreshold'] };
    else if (stock === 'in')  filter.$and  = [{ stock: { $gt: 0 } }];
    // 'in,low' from billing
    else if (stock === 'in,low') filter.stock = { $gt: 0 };

    const [products, total] = await Promise.all([
      db.collection('products')
        .aggregate([
          { $match: filter },
          { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: '_cat' } },
          { $addFields: { category: { $arrayElemAt: ['$_cat', 0] } } },
          { $project: { _cat: 0, passwordHash: 0 } },
          { $sort: { [sortBy]: sortDir } },
          { $skip: skip },
          { $limit: limit },
        ])
        .toArray(),
      db.collection('products').countDocuments(filter),
    ]);

    return ok(res, products, { total, page, limit });
  } catch (err) {
    console.error('[products.list]', err);
    return serverError(res);
  }
}

async function get(req, res, id) {
  try {
    if (!ObjectId.isValid(id)) return notFound(res);
    const db  = await getDb();
    const [product] = await db.collection('products').aggregate([
      { $match: { _id: new ObjectId(id) } },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: '_cat' } },
      { $addFields: { category: { $arrayElemAt: ['$_cat', 0] } } },
      { $project: { _cat: 0 } },
    ]).toArray();
    if (!product) return notFound(res, 'Product not found');
    return ok(res, product);
  } catch (err) {
    console.error('[products.get]', err);
    return serverError(res);
  }
}

async function create(req, res) {
  try {
    const body   = await parseBody(req);
    const errors = validateProduct(body);
    if (errors.length) return badRequest(res, errors[0], { errors });

    const db  = await getDb();
    const sku = body.sku.trim().toUpperCase();

    // Validate category
    let categoryId = null;
    if (body.category) {
      if (!ObjectId.isValid(body.category)) return badRequest(res, 'Invalid category ID');
      categoryId = new ObjectId(body.category);
      const cat = await db.collection('categories').findOne({ _id: categoryId });
      if (!cat) return badRequest(res, 'Category not found');
    }

    const now = new Date();
    const doc = {
      name:             body.name.trim(),
      sku,
      category:         categoryId,
      description:      (body.description || '').trim(),
      costPrice:        Number(body.costPrice),
      sellingPrice:     Number(body.sellingPrice),
      stock:            Number(body.stock ?? 0),
      reorderThreshold: Number(body.reorderThreshold ?? 10),
      active:           true,
      createdAt:        now,
      updatedAt:        now,
    };

    try {
      const result = await db.collection('products').insertOne(doc);
      // Record initial stock movement
      if (doc.stock > 0) {
        await db.collection('inventory_movements').insertOne({
          product:     result.insertedId,
          type:        'stock-in',
          quantity:    doc.stock,
          stockAfter:  doc.stock,
          notes:       'Initial stock',
          createdBy:   req.user._id,
          createdAt:   now,
        });
      }
      const created_doc = await db.collection('products').findOne({ _id: result.insertedId });
      return created(res, created_doc);
    } catch (e) {
      if (e.code === 11000) return conflict(res, `SKU "${sku}" is already in use`);
      throw e;
    }
  } catch (err) {
    if (err.statusCode) return badRequest(res, err.message);
    console.error('[products.create]', err);
    return serverError(res);
  }
}

async function update(req, res, id) {
  try {
    if (!ObjectId.isValid(id)) return notFound(res);
    const body = await parseBody(req);
    const db   = await getDb();
    const _id  = new ObjectId(id);
    const existing = await db.collection('products').findOne({ _id });
    if (!existing) return notFound(res, 'Product not found');

    // Build safe update (server controls what can change)
    const updates = {};
    if (body.name !== undefined)             updates.name             = body.name.trim();
    if (body.description !== undefined)      updates.description      = body.description.trim();
    if (body.costPrice !== undefined)        updates.costPrice        = Number(body.costPrice);
    if (body.sellingPrice !== undefined)     updates.sellingPrice     = Number(body.sellingPrice);
    if (body.reorderThreshold !== undefined) updates.reorderThreshold = Number(body.reorderThreshold);
    if (body.sku !== undefined) {
      const sku = body.sku.trim().toUpperCase();
      if (sku !== existing.sku) {
        const skuExists = await db.collection('products').findOne({ sku, _id: { $ne: _id } });
        if (skuExists) return conflict(res, `SKU "${sku}" is already in use`);
        updates.sku = sku;
      }
    }
    if (body.category !== undefined) {
      if (body.category && !ObjectId.isValid(body.category)) return badRequest(res, 'Invalid category ID');
      updates.category = body.category ? new ObjectId(body.category) : null;
    }
    if (body.active !== undefined) updates.active = Boolean(body.active);

    // Validate numeric fields
    if (updates.costPrice < 0) return badRequest(res, 'Cost price cannot be negative');
    if (updates.sellingPrice !== undefined && updates.sellingPrice <= 0)
      return badRequest(res, 'Selling price must be positive');

    updates.updatedAt = new Date();
    await db.collection('products').updateOne({ _id }, { $set: updates });
    const updated = await db.collection('products').findOne({ _id });
    return ok(res, updated);
  } catch (err) {
    if (err.statusCode) return badRequest(res, err.message);
    console.error('[products.update]', err);
    return serverError(res);
  }
}

async function deactivate(req, res, id) {
  try {
    if (!ObjectId.isValid(id)) return notFound(res);
    const db  = await getDb();
    const _id = new ObjectId(id);
    const result = await db.collection('products').updateOne(
      { _id },
      { $set: { active: false, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return notFound(res, 'Product not found');
    return ok(res, { deactivated: true });
  } catch (err) {
    console.error('[products.deactivate]', err);
    return serverError(res);
  }
}

module.exports = { list, get, create, update, deactivate };
