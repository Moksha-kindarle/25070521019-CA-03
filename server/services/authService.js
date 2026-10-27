'use strict';
const crypto = require('crypto');
const { getDb } = require('../config/database');

// ---- Password hashing (scrypt) ----
const SALT_LEN = 32;
const KEY_LEN  = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LEN).toString('hex');
    crypto.scrypt(password, salt, KEY_LEN, SCRYPT_PARAMS, (err, key) => {
      if (err) return reject(err);
      resolve(`${salt}:${key.toString('hex')}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, keyHex] = stored.split(':');
    if (!salt || !keyHex) return resolve(false);
    const storedKey = Buffer.from(keyHex, 'hex');
    crypto.scrypt(password, salt, KEY_LEN, SCRYPT_PARAMS, (err, key) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(storedKey, key));
    });
  });
}

// ---- Session tokens ----
function generateSessionToken() {
  return crypto.randomBytes(40).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ---- Auth Service ----
async function signup({ name, email, password }) {
  const db = await getDb();
  const exists = await db.collection('users').findOne({ email: email.toLowerCase() });
  if (exists) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const result = await db.collection('users').insertOne({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'user',
    createdAt: now,
    updatedAt: now,
    active: true,
  });
  const user = await db.collection('users').findOne({ _id: result.insertedId }, { projection: { passwordHash: 0 } });
  return user;
}

async function login({ email, password }) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.active) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }
  // Create session
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.collection('sessions').insertOne({
    tokenHash,
    userId: user._id,
    expiresAt,
    createdAt: new Date(),
  });
  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return { token, user: safeUser };
}

async function logout(token) {
  if (!token) return;
  const db = await getDb();
  const tokenHash = hashToken(token);
  await db.collection('sessions').deleteOne({ tokenHash });
}

async function getSessionUser(token) {
  if (!token) return null;
  const db = await getDb();
  const tokenHash = hashToken(token);
  const session = await db.collection('sessions').findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await db.collection('users').findOne(
    { _id: session.userId, active: true },
    { projection: { passwordHash: 0 } }
  );
  return user || null;
}

module.exports = { signup, login, logout, getSessionUser, hashPassword, verifyPassword };
