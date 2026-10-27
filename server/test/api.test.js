'use strict';
/**
 * StockPilot API Integration Tests
 * Uses Node.js built-in http module — no test framework needed.
 * Run: node test/api.test.js
 * Server must be running on PORT 5000 before running tests.
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000/api/v1';
const TEST_EMAIL    = `test_${Date.now()}@stockpilot.test`;
const TEST_PASSWORD = 'TestPass@123';
const TEST_NAME     = 'Test User';

let passed = 0;
let failed = 0;
let sessionCookie = '';

// ── Helpers ───────────────────────────────────────────────────────────────────
function request(method, path, body = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const url      = new URL(BASE_URL + path);
    const payload  = body ? JSON.stringify(body) : null;
    const options  = {
      hostname: url.hostname,
      port:     url.port || 5000,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(cookie   ? { 'Cookie': cookie }                            : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json    = JSON.parse(data);
          const cookies = res.headers['set-cookie'] || [];
          resolve({ status: res.status || res.statusCode, body: json, rawCookies: cookies });
        } catch {
          resolve({ status: res.statusCode, body: data, rawCookies: [] });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, name, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// Extract Set-Cookie session token
function extractCookie(rawCookies) {
  for (const c of rawCookies) {
    if (c.startsWith('sp_session=')) return c.split(';')[0];
  }
  return '';
}

// ── Test Suites ───────────────────────────────────────────────────────────────
async function testHealth() {
  console.log('\n── Health Check ──────────────────────────────────────────');
  const r = await request('GET', '/health');
  assert(r.status === 200,          'GET /health returns 200');
  assert(r.body.status === 'ok',    'Response body has status=ok');
}

async function testSignup() {
  console.log('\n── Signup ────────────────────────────────────────────────');

  // 1. Valid registration
  const r1 = await request('POST', '/auth/signup', {
    name:     TEST_NAME,
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert(r1.status === 201,              'Valid signup returns 201');
  assert(r1.body.success === true,       'success=true');
  assert(r1.body.data?.user?.email === TEST_EMAIL.toLowerCase(), 'Returned user email matches');
  assert(!r1.body.data?.user?.passwordHash, 'passwordHash NOT in response');
  sessionCookie = extractCookie(r1.rawCookies);
  assert(sessionCookie !== '',           'Session cookie set after signup');

  // 2. Duplicate email
  const r2 = await request('POST', '/auth/signup', {
    name:     TEST_NAME,
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert(r2.status === 409,             'Duplicate email returns 409');
  assert(r2.body.success === false,     'success=false on duplicate');

  // 3. Missing name
  const r3 = await request('POST', '/auth/signup', {
    email:    `other_${Date.now()}@test.com`,
    password: TEST_PASSWORD,
  });
  assert(r3.status === 400,             'Missing name returns 400');

  // 4. Short password
  const r4 = await request('POST', '/auth/signup', {
    name:     'X',
    email:    `short_${Date.now()}@test.com`,
    password: '123',
  });
  assert(r4.status === 400,             'Short password returns 400');

  // 5. Invalid email
  const r5 = await request('POST', '/auth/signup', {
    name:     'Test',
    email:    'not-an-email',
    password: TEST_PASSWORD,
  });
  assert(r5.status === 400,             'Invalid email returns 400');
}

async function testLogin() {
  console.log('\n── Login ─────────────────────────────────────────────────');

  // 1. Valid login
  const r1 = await request('POST', '/auth/login', {
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert(r1.status === 200,             'Valid login returns 200');
  assert(r1.body.data?.user?.email === TEST_EMAIL.toLowerCase(), 'User email in response');
  assert(!r1.body.data?.user?.passwordHash, 'No passwordHash in response');
  const loginCookie = extractCookie(r1.rawCookies);
  assert(loginCookie !== '',            'Session cookie set on login');

  // 2. Wrong password
  const r2 = await request('POST', '/auth/login', {
    email:    TEST_EMAIL,
    password: 'WrongPassword!',
  });
  assert(r2.status === 401,             'Wrong password returns 401');

  // 3. Non-existent user
  const r3 = await request('POST', '/auth/login', {
    email:    'nobody@nowhere.com',
    password: TEST_PASSWORD,
  });
  assert(r3.status === 401,             'Unknown email returns 401');
}

async function testAuth() {
  console.log('\n── Protected Routes ──────────────────────────────────────');

  // 1. /auth/me with valid session
  const r1 = await request('GET', '/auth/me', null, sessionCookie);
  assert(r1.status === 200,             'GET /auth/me with cookie returns 200');
  assert(r1.body.data?.user?.name === TEST_NAME, 'me returns correct name');

  // 2. /auth/me without session
  const r2 = await request('GET', '/auth/me');
  assert(r2.status === 401,             'GET /auth/me without cookie returns 401');

  // 3. Protected endpoint without auth
  const r3 = await request('GET', '/dashboard/summary');
  assert(r3.status === 401,             'Dashboard without auth returns 401');

  // 4. Protected endpoint with valid session
  const r4 = await request('GET', '/dashboard/summary', null, sessionCookie);
  assert(r4.status === 200,             'Dashboard with auth returns 200');
  assert(typeof r4.body.data?.totalProducts === 'number', 'totalProducts is a number');
}

async function testLogout() {
  console.log('\n── Logout ────────────────────────────────────────────────');
  const r1 = await request('POST', '/auth/logout', null, sessionCookie);
  assert(r1.status === 200,             'Logout returns 200');

  // Session should be invalidated
  const r2 = await request('GET', '/auth/me', null, sessionCookie);
  assert(r2.status === 401,             'Old session invalid after logout');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  StockPilot API Tests                ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Target: ${BASE_URL}`);

  try {
    await testHealth();
    await testSignup();
    await testLogin();
    await testAuth();
    await testLogout();
  } catch (err) {
    console.error('\n💥 Test runner error:', err.message);
    console.error('   Is the server running? (npm start in server/)');
    failed++;
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
