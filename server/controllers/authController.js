'use strict';
const { parseBody, ok, created, badRequest, unauthorized, conflict, serverError } = require('../utils/http');
const authService = require('../services/authService');
const { validateSignup, validateLogin } = require('../validators');
const { loginLimiter, getClientIp } = require('../utils/rateLimiter');
const { parseCookies } = require('../middleware/auth');

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const IS_PROD = process.env.NODE_ENV === 'production';

function setSessionCookie(res, token) {
  const flags = [
    `sp_session=${token}`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Path=/`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    IS_PROD ? 'Secure' : '',
  ].filter(Boolean).join('; ');
  res.setHeader('Set-Cookie', flags);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sp_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
}

async function signup(req, res) {
  try {
    const body   = await parseBody(req);
    const errors = validateSignup(body);
    if (errors.length) return badRequest(res, errors[0], { errors });

    const user  = await authService.signup(body);
    const { token, user: loggedIn } = await authService.login({
      email: body.email,
      password: body.password,
    });
    setSessionCookie(res, token);
    return created(res, { user: loggedIn });
  } catch (err) {
    if (err.statusCode === 409) return conflict(res, err.message);
    console.error('[signup]', err);
    return serverError(res, 'Signup failed');
  }
}

async function login(req, res) {
  const ip = getClientIp(req);
  const { allowed } = loginLimiter.check(ip);
  if (!allowed) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, message: 'Too many login attempts. Please wait 15 minutes.' }));
  }
  try {
    const body   = await parseBody(req);
    const errors = validateLogin(body);
    if (errors.length) return badRequest(res, errors[0]);

    const { token, user } = await authService.login(body);
    setSessionCookie(res, token);
    return ok(res, { user });
  } catch (err) {
    if (err.statusCode === 401) return unauthorized(res, err.message);
    console.error('[login]', err);
    return serverError(res, 'Login failed');
  }
}

async function logout(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token   = cookies['sp_session'];
  await authService.logout(token).catch(() => {});
  clearSessionCookie(res);
  return ok(res, null);
}

async function me(req, res) {
  if (!req.user) return unauthorized(res);
  return ok(res, { user: req.user });
}

module.exports = { signup, login, logout, me };
