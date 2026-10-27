'use strict';

/** Validates signup input. Returns array of error strings (empty = valid). */
function validateSignup({ name, email, password }) {
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length < 2)
    errors.push('Name must be at least 2 characters');
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.push('Valid email address is required');
  if (!password || typeof password !== 'string' || password.length < 8)
    errors.push('Password must be at least 8 characters');
  return errors;
}

/** Validates login input. */
function validateLogin({ email, password }) {
  const errors = [];
  if (!email || typeof email !== 'string')  errors.push('Email is required');
  if (!password || typeof password !== 'string') errors.push('Password is required');
  return errors;
}

/** Validates product input. */
function validateProduct({ name, sku, costPrice, sellingPrice, reorderThreshold }) {
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length < 1)
    errors.push('Product name is required');
  if (!sku || typeof sku !== 'string' || sku.trim().length < 1)
    errors.push('SKU is required');
  if (costPrice === undefined || isNaN(Number(costPrice)) || Number(costPrice) < 0)
    errors.push('Valid cost price is required');
  if (sellingPrice === undefined || isNaN(Number(sellingPrice)) || Number(sellingPrice) <= 0)
    errors.push('Valid selling price is required');
  if (reorderThreshold !== undefined && (isNaN(Number(reorderThreshold)) || Number(reorderThreshold) < 0))
    errors.push('Reorder threshold must be a non-negative number');
  return errors;
}

/** Validates inventory adjustment. */
function validateAdjustment({ productId, type, quantity }) {
  const errors = [];
  if (!productId) errors.push('productId is required');
  if (!['stock-in', 'stock-out', 'adjustment'].includes(type))
    errors.push('type must be stock-in, stock-out, or adjustment');
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0)
    errors.push('quantity must be a positive number');
  return errors;
}

module.exports = { validateSignup, validateLogin, validateProduct, validateAdjustment };
