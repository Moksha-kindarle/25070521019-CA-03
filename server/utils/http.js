'use strict';

/**
 * Parses a raw request body into a JavaScript object.
 * Enforces a 1 MB size limit to prevent oversized payloads.
 */
function parseBody(req, maxBytes = 1_048_576) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        req.destroy();
        return reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Sends a JSON response with the given status code.
 */
function send(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type':  'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function ok(res, data, meta = {})       { send(res, 200, { success: true,  data,   ...meta }); }
function created(res, data)              { send(res, 201, { success: true,  data }); }
function noContent(res)                  { res.writeHead(204); res.end(); }
function badRequest(res, message, extra) { send(res, 400, { success: false, message, ...extra }); }
function unauthorized(res, message = 'Authentication required') { send(res, 401, { success: false, message }); }
function forbidden(res, message = 'Access denied')              { send(res, 403, { success: false, message }); }
function notFound(res, message = 'Not found')                   { send(res, 404, { success: false, message }); }
function conflict(res, message)          { send(res, 409, { success: false, message }); }
function tooManyRequests(res, message = 'Too many requests. Try again later.') { send(res, 429, { success: false, message }); }
function serverError(res, message = 'Internal server error') { send(res, 500, { success: false, message }); }

module.exports = {
  parseBody, send, ok, created, noContent,
  badRequest, unauthorized, forbidden, notFound,
  conflict, tooManyRequests, serverError,
};
