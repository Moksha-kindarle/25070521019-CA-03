'use strict';

/**
 * Simple in-memory rate limiter.
 * Tracks request counts per IP within a sliding window.
 */
class RateLimiter {
  constructor({ windowMs = 60_000, max = 10 } = {}) {
    this.windowMs = windowMs;
    this.max      = max;
    this.store    = new Map(); // ip → { count, resetAt }
    // Purge stale entries every minute
    setInterval(() => this._purge(), 60_000).unref();
  }

  check(ip) {
    const now    = Date.now();
    const entry  = this.store.get(ip);
    if (!entry || now > entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.max - 1 };
    }
    entry.count++;
    const allowed = entry.count <= this.max;
    return { allowed, remaining: Math.max(0, this.max - entry.count) };
  }

  _purge() {
    const now = Date.now();
    for (const [ip, entry] of this.store) {
      if (now > entry.resetAt) this.store.delete(ip);
    }
  }
}

// Login rate limiter: max 10 attempts per 15 minutes per IP
const loginLimiter = new RateLimiter({ windowMs: 15 * 60_000, max: 10 });

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '0.0.0.0'
  );
}

module.exports = { RateLimiter, loginLimiter, getClientIp };
