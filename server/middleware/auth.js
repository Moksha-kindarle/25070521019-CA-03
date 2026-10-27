'use strict';
const { getSessionUser } = require('../services/authService');

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
  });
  return cookies;
}

async function authenticate(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['sp_session'];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = await getSessionUser(token);
  } catch {
    req.user = null;
  }
  next();
}

function requireAuth(req, res) {
  if (!req.user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Authentication required' }));
    return false;
  }
  return true;
}

function requireRole(role) {
  return (req, res) => {
    if (!req.user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Authentication required' }));
      return false;
    }
    if (req.user.role !== role) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Access denied' }));
      return false;
    }
    return true;
  };
}

module.exports = { authenticate, requireAuth, requireRole, parseCookies };
