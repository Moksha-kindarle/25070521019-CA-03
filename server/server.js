'use strict';
require('dotenv').config();
const http = require('http');
const { connect } = require('./config/database');
const { authenticate } = require('./middleware/auth');

// Controllers
const authCtrl      = require('./controllers/authController');
const productsCtrl  = require('./controllers/productsController');
const categoriesCtrl = require('./controllers/categoriesController');
const inventoryCtrl = require('./controllers/inventoryController');
const salesCtrl     = require('./controllers/salesController');
const analytics     = require('./controllers/analyticsController');

const PORT        = parseInt(process.env.PORT || '5000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ── CORS headers ─────────────────────────────────────────────────────────────
function setCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin',      CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods',     'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type');
}

// ── URL route matching ────────────────────────────────────────────────────────
const BASE = '/api/v1';

function match(url, pattern) {
  // pattern like '/products/:id' → returns params object or null
  const patParts = pattern.split('/');
  const urlParts = url.split('/');
  if (patParts.length !== urlParts.length) return null;
  const params = {};
  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i].startsWith(':')) {
      params[patParts[i].slice(1)] = decodeURIComponent(urlParts[i]);
    } else if (patParts[i] !== urlParts[i]) {
      return null;
    }
  }
  return params;
}

// Strips query string from URL path for route matching
function pathname(url) {
  return url.split('?')[0];
}

// ── Request handler ───────────────────────────────────────────────────────────
async function handleRequest(req, res) {
  setCors(req, res);

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const path   = pathname(req.url);
  const method = req.method;

  // Only handle /api/v1 prefix
  if (!path.startsWith(BASE)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, message: 'Not found' }));
  }

  const route = path.slice(BASE.length) || '/';

  // Attach user from session cookie (sets req.user = null if not logged in)
  await authenticate(req, res, () => {});

  // ── Health ──────────────────────────────────────────────────────────────────
  if (method === 'GET' && route === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', ts: new Date().toISOString() }));
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  if (method === 'POST' && route === '/auth/signup')  return authCtrl.signup(req, res);
  if (method === 'POST' && route === '/auth/login')   return authCtrl.login(req, res);
  if (method === 'POST' && route === '/auth/logout')  return authCtrl.logout(req, res);
  if (method === 'GET'  && route === '/auth/me')      return authCtrl.me(req, res);

  // ── All routes below require authentication ─────────────────────────────────
  if (!req.user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, message: 'Authentication required' }));
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  if (method === 'GET' && route === '/dashboard/summary') return analytics.dashboard(req, res);
  if (method === 'GET' && route === '/dashboard/trends')  return analytics.trends(req, res);
  if (method === 'GET' && route === '/dashboard/alerts')  return analytics.alerts(req, res);

  // ── Categories ──────────────────────────────────────────────────────────────
  if (method === 'GET'  && route === '/categories') return categoriesCtrl.list(req, res);
  if (method === 'POST' && route === '/categories') return categoriesCtrl.create(req, res);

  // ── Products ────────────────────────────────────────────────────────────────
  if (method === 'GET'  && route === '/products') return productsCtrl.list(req, res);
  if (method === 'POST' && route === '/products') return productsCtrl.create(req, res);

  let params;
  if ((params = match(route, '/products/:id'))) {
    if (method === 'GET')    return productsCtrl.get(req, res, params.id);
    if (method === 'PATCH')  return productsCtrl.update(req, res, params.id);
    if (method === 'DELETE') return productsCtrl.deactivate(req, res, params.id);
  }

  // ── Inventory ───────────────────────────────────────────────────────────────
  if (method === 'GET'  && route === '/inventory/movements') return inventoryCtrl.movements(req, res);
  if (method === 'POST' && route === '/inventory/adjust')    return inventoryCtrl.adjust(req, res);

  // ── Sales / Invoices ────────────────────────────────────────────────────────
  if (method === 'GET'  && route === '/sales') return salesCtrl.list(req, res);
  if (method === 'POST' && route === '/sales') return salesCtrl.create(req, res);

  if ((params = match(route, '/sales/:id'))) {
    if (method === 'GET') return salesCtrl.get(req, res, params.id);
  }
  if ((params = match(route, '/sales/:id/cancel'))) {
    if (method === 'PATCH') return salesCtrl.cancel(req, res, params.id);
  }

  // ── Reports ─────────────────────────────────────────────────────────────────
  if (method === 'GET' && route === '/reports/sales')        return analytics.salesReport(req, res);
  if (method === 'GET' && route === '/reports/top-products') return analytics.topProducts(req, res);
  if (method === 'GET' && route === '/reports/stock')        return analytics.stockSummary(req, res);

  // ── Users / Profile ─────────────────────────────────────────────────────────
  if (method === 'PATCH' && route === '/users/profile')  return analytics.updateProfile(req, res);
  if (method === 'PATCH' && route === '/users/password') return analytics.changePassword(req, res);

  // ── 404 ─────────────────────────────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, message: `Route not found: ${method} ${route}` }));
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connect();
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    try {
      await handleRequest(req, res);
    } catch (err) {
      console.error('Unhandled error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
      }
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 StockPilot server running → http://127.0.0.1:${PORT}`);
    console.log(`   API base: http://127.0.0.1:${PORT}/api/v1`);
    console.log(`   Health:   http://127.0.0.1:${PORT}/api/v1/health`);
    console.log(`   Env:      ${process.env.NODE_ENV || 'development'}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT',  () => { server.close(); process.exit(0); });
  process.on('SIGTERM', () => { server.close(); process.exit(0); });
}

start();
