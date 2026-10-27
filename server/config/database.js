'use strict';
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/';
const DB_NAME     = process.env.DB_NAME     || 'stockpilot';

let _client = null;
let _db     = null;

async function connect() {
  if (_db) return _db;
  _client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  await _client.connect();
  _db = _client.db(DB_NAME);
  console.log(`✅ MongoDB connected → ${DB_NAME} (${MONGODB_URI})`);
  await ensureIndexes(_db);
  return _db;
}

async function getDb() {
  if (!_db) await connect();
  return _db;
}

function getClient() {
  return _client;
}

/** Returns true when the server has replica set support (needed for transactions). */
async function hasReplicaSet() {
  try {
    const admin = _db.admin();
    const info  = await admin.command({ replSetGetStatus: 1 });
    return info.ok === 1;
  } catch {
    return false;
  }
}

async function ensureIndexes(db) {
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true });
    await db.collection('sessions').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
    await db.collection('products').createIndex({ sku: 1 }, { unique: true });
    await db.collection('products').createIndex(
      { name: 'text', sku: 'text', description: 'text' }
    );
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ stock: 1 });
    await db.collection('inventory_movements').createIndex({ product: 1, createdAt: -1 });
    await db.collection('inventory_movements').createIndex({ createdAt: -1 });
    await db.collection('sales').createIndex({ invoiceNumber: 1 }, { unique: true, sparse: true });
    await db.collection('sales').createIndex({ createdAt: -1 });
    await db.collection('sales').createIndex({ status: 1 });
    await db.collection('categories').createIndex({ name: 1 }, { unique: true });
    console.log('✅ Indexes ensured');
  } catch (err) {
    // Index errors are non-fatal (e.g. already exist)
    console.warn('⚠ Index warning:', err.message);
  }
}

async function disconnect() {
  if (_client) {
    await _client.close();
    _client = null;
    _db     = null;
  }
}

module.exports = { connect, getDb, getClient, hasReplicaSet, disconnect };
