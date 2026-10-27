import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi, productsApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Plus, Minus, Package, Search, RefreshCw,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Settings
} from 'lucide-react';
import './Inventory.css';

const LIMIT = 20;
const mvType = {
  'stock-in':     { label: 'Stock In',    color: 'var(--success)',        icon: ArrowUpCircle },
  'stock-out':    { label: 'Stock Out',   color: 'var(--danger)',         icon: ArrowDownCircle },
  'adjustment':   { label: 'Adjustment', color: 'var(--info)',           icon: Settings },
  'sale':         { label: 'Sale',       color: 'var(--accent-pink)',    icon: Minus },
};

export default function InventoryPage() {
  const toast = useToast();
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ productId: '', type: 'stock-in', quantity: '', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      const res = await inventoryApi.movements(params);
      setMovements(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast(e.message || 'Failed to load movements', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [typeFilter, search]);

  useEffect(() => {
    productsApi.list({ limit: 200 }).then(r => setProducts(r.data || [])).catch(() => {});
  }, []);

  const setF = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setFormErrors(er => ({ ...er, [field]: undefined }));
  };

  const validateForm = () => {
    const e = {};
    if (!form.productId) e.productId = 'Select a product';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0) e.quantity = 'Enter a positive quantity';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validateForm();
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setSubmitting(true);
    try {
      await inventoryApi.adjust({
        productId: form.productId,
        type: form.type,
        quantity: Number(form.quantity),
        notes: form.notes.trim(),
      });
      toast('Stock adjustment recorded', 'success');
      setShowModal(false);
      setForm({ productId: '', type: 'stock-in', quantity: '', notes: '' });
      load();
    } catch (err) {
      toast(err.message || 'Adjustment failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Inventory</h1>
          <p>Stock movements and adjustments history</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={15} /></button>
          <button className="btn btn-primary btn-sm" id="adjust-stock-btn" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Adjust Stock
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div className="filters-row">
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input className="form-input" placeholder="Search product..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
          </div>
          <select className="form-select" style={{ width: 180, height: 44 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="stock-in">Stock In</option>
            <option value="stock-out">Stock Out</option>
            <option value="adjustment">Adjustment</option>
            <option value="sale">Sale</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Stock After</th>
              <th>Notes</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 16, width: '75%', borderRadius: 4 }} /></td>
                ))}</tr>
              ))
            ) : movements.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <Package size={40} />
                  <h3>No movements recorded</h3>
                  <p>Stock movements will appear here as you make adjustments or process sales.</p>
                </div>
              </td></tr>
            ) : movements.map(m => {
              const mt = mvType[m.type] || { label: m.type, color: 'var(--text-secondary)', icon: Package };
              const Icon = mt.icon;
              const isIn = m.type === 'stock-in' || (m.type === 'adjustment' && m.quantity > 0);
              return (
                <tr key={m._id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td style={{ fontWeight: 500 }}>{m.product?.name || '—'}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: mt.color }}>
                      <Icon size={15} />
                      <span className="badge" style={{
                        background: `${mt.color}18`,
                        color: mt.color,
                        border: `1px solid ${mt.color}30`
                      }}>{mt.label}</span>
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: isIn ? 'var(--success)' : 'var(--danger)' }}>
                      {isIn ? '+' : '-'}{Math.abs(m.quantity)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{m.stockAfter}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.notes || '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{m.createdBy?.name || 'System'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          {[...Array(Math.min(totalPages, 7))].map((_, i) => (
            <button key={i+1} className={`pagination-btn ${page === i+1 ? 'active' : ''}`} onClick={() => setPage(i+1)}>
              {i+1}
            </button>
          ))}
          <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adjust Stock</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Product *</label>
                    <select className={`form-select ${formErrors.productId ? 'error' : ''}`}
                      value={form.productId} onChange={setF('productId')} id="adj-product">
                      <option value="">Select product</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name} (Stock: {p.stock})</option>)}
                    </select>
                    {formErrors.productId && <span className="form-error">{formErrors.productId}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Movement Type *</label>
                    <select className="form-select" value={form.type} onChange={setF('type')} id="adj-type">
                      <option value="stock-in">Stock In (Add)</option>
                      <option value="stock-out">Stock Out (Remove)</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input type="number" min="1" step="1"
                      className={`form-input ${formErrors.quantity ? 'error' : ''}`}
                      placeholder="Enter quantity" value={form.quantity} onChange={setF('quantity')} id="adj-qty" />
                    {formErrors.quantity && <span className="form-error">{formErrors.quantity}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" rows={2} placeholder="Optional reason or notes..."
                      value={form.notes} onChange={setF('notes')} id="adj-notes" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" id="adj-submit" className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`} disabled={submitting}>
                  {!submitting && 'Record Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
