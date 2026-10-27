'use strict';
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { ok, created, badRequest, notFound, conflict, serverError, parseBody } = require('../utils/http');

async function list(req, res) {
  try {
    const db   = await getDb();
    const cats = await db.collection('categories').find().sort({ name: 1 }).toArray();
    return ok(res, cats);
  } catch (err) {
    console.error('[categories.list]', err);
    return serverError(res);
  }
}

async function create(req, res) {
  try {
    const body = await parseBody(req);
    const name = (body.name || '').trim();
    if (!name) return badRequest(res, 'Category name is required');
    const db  = await getDb();
    const now = new Date();
    try {
      const result = await db.collection('categories').insertOne({ name, createdAt: now, updatedAt: now });
      const doc    = await db.collection('categories').findOne({ _id: result.insertedId });
      return created(res, doc);
    } catch (e) {
      if (e.code === 11000) return conflict(res, `Category "${name}" already exists`);
      throw e;
    }
  } catch (err) {
    if (err.statusCode) return badRequest(res, err.message);
    console.error('[categories.create]', err);
    return serverError(res);
  }
}

module.exports = { list, create };
