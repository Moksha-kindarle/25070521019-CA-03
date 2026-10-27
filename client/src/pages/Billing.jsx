import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi, salesApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  Package, Check, AlertTriangle, Loader
} from 'lucide-react';
import './Billing.css';

export default function BillingPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [checking, setChecking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notes, setNotes] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productsApi.list({ limit: 200, stock: 'in,low', sortBy: 'name', sortDir: 'asc' });
      setProducts(res.data || []);
    } catch {
      toast('Failed to load products', 'error');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart(c => {
      const existing = c.find(i => i.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast(`Only ${product.stock} units available`, 'warning');
          return c;
        }
        return c.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.stock === 0) {
        toast('This product is out of stock', 'warning');
        return c;
      }
      return [...c, {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        price: product.sellingPrice,
        stock: product.stock,
        quantity: 1,
      }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(c => c.map(i => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.stock) { toast(`Only ${i.stock} units available`, 'warning'); return i; }
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(c => c.filter(i => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) { toast('Cart is empty', 'warning'); return; }
    setChecking(true);
    try {
      const res = await salesApi.create({
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        notes: notes.trim(),
      });
      toast('Invoice created successfully!', 'success');
      setCart([]);
      setNotes('');
      setShowConfirm(false);
      navigate(`/invoices/${res.data._id}`);
    } catch (err) {
      toast(err.message || 'Checkout failed', 'error');
      if (err.data?.insufficientStock) {
        toast('Some items have insufficient stock. Please review your cart.', 'warning');
        loadProducts(); // Refresh stock
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="animate-fade-in billing-layout">
      {/* Left: Product Catalog */}
      <div className="billing-catalog">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div className="page-header-left">
            <h1>Billing / POS</h1>
            <p>Search and add products to cart</p>
          </div>
        </div>

        <div className="search-bar" style={{ marginBottom: 16 }}>
          <Search size={16} className="search-icon" />
          <input
            id="billing-search"
            className="form-input"
            placeholder="Search product or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {loadingProducts ? (
          <div className="product-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Package size={40} />
            <h3>No products found</h3>
            <p>{search ? 'Try a different search term' : 'Add products from the catalogue'}</p>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(p => (
              <button
                key={p._id}
                className={`product-tile ${p.stock === 0 ? 'out-of-stock' : ''}`}
                onClick={() => addToCart(p)}
                disabled={p.stock === 0}
                title={p.stock === 0 ? 'Out of stock' : `Add ${p.name}`}
              >
                <div className="product-tile-name">{p.name}</div>
                <div className="product-tile-sku">{p.sku}</div>
                <div className="product-tile-bottom">
                  <span className="product-tile-price">₹{p.sellingPrice?.toLocaleString('en-IN')}</span>
                  <span className={`badge ${p.stock === 0 ? 'badge-danger' : p.stock <= p.reorderThreshold ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                    {p.stock === 0 ? 'OOS' : `${p.stock}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Cart */}
      <div className="billing-cart card">
        <div className="cart-header">
          <h3><ShoppingCart size={18} /> Cart</h3>
          <span className="badge badge-purple">{cart.length} items</span>
        </div>

        {cart.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <ShoppingCart size={36} />
            <p>Click products to add them</p>
          </div>
        ) : (
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">₹{item.price?.toLocaleString('en-IN')} each</div>
                </div>
                <div className="cart-item-controls">
                  <button className="qty-btn" onClick={() => updateQty(item.productId, -1)}>
                    <Minus size={12} />
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.productId, 1)}>
                    <Plus size={12} />
                  </button>
                  <button className="qty-btn qty-remove" onClick={() => removeFromCart(item.productId)}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="cart-item-total">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="summary-row">
              <span>GST (18%)</span>
              <span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="divider" style={{ margin: '10px 0' }} />
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-textarea" rows={2} placeholder="Customer name, remarks..."
                value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 60 }} />
            </div>
            <button
              id="checkout-btn"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => setShowConfirm(true)}
            >
              <Check size={16} /> Checkout & Generate Invoice
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 6 }}
              onClick={() => setCart([])}>
              Clear Cart
            </button>
          </div>
        )}
      </div>

      {/* Checkout Confirm Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => !checking && setShowConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Checkout</h3>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>Review your order before finalizing:</p>
              {cart.map(item => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}>
                  <span>{item.name} × {item.quantity}</span>
                  <span style={{ fontWeight: 500 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: '1rem' }}>
                <span>Total (incl. GST 18%)</span>
                <span style={{ color: 'var(--accent-violet)' }}>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)} disabled={checking}>
                Back to Cart
              </button>
              <button
                id="confirm-checkout-btn"
                className={`btn btn-primary ${checking ? 'btn-loading' : ''}`}
                disabled={checking}
                onClick={handleCheckout}
              >
                {!checking && <><Check size={16} /> Confirm &amp; Create Invoice</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
