import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productsApi, categoriesApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Plus, Search, Filter, Edit2, Trash2, Package,
  ChevronLeft, ChevronRight, AlertTriangle, RefreshCw
} from 'lucide-react';

const LIMIT = 20;

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sortBy, sortDir };
      if (search) params.search = search;
      if (catFilter) params.category = catFilter;
      if (stockFilter) params.stock = stockFilter;
      const res = await productsApi.list(params);
      setProducts(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast(e.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, catFilter, stockFilter, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, catFilter, stockFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await productsApi.delete(deleteId);
      toast('Product deactivated successfully', 'success');
      setDeleteId(null);
      load();
    } catch (e) {
      toast(e.message || 'Failed to delete product', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const StockBadge = ({ stock, threshold }) => {
    if (stock === 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (stock <= threshold) return <span className="badge badge-warning">Low Stock</span>;
    return <span className="badge badge-success">In Stock</span>;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Products</h1>
          <p>{total} products in catalogue</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={15} />
          </button>
          <Link to="/products/new" className="btn btn-primary btn-sm" id="add-product-btn">
            <Plus size={15} /> Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div className="filters-row">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input
              className="form-input"
              id="product-search"
              placeholder="Search products, SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" id="cat-filter" style={{ width: 180, height: 44 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select className="form-select" id="stock-filter" style={{ width: 160, height: 44 }} value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
            <option value="">All Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
            <option value="in">In Stock</option>
          </select>
          <select className="form-select" style={{ width: 180, height: 44 }} value={`${sortBy}:${sortDir}`} onChange={e => {
            const [f, d] = e.target.value.split(':');
            setSortBy(f); setSortDir(d);
          }}>
            <option value="createdAt:desc">Newest First</option>
            <option value="name:asc">Name A-Z</option>
            <option value="name:desc">Name Z-A</option>
            <option value="stock:asc">Stock Low-High</option>
            <option value="sellingPrice:desc">Price High-Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 18, width: '80%', borderRadius: 4 }} /></td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <Package size={40} />
                    <h3>No products found</h3>
                    <p>{search || catFilter || stockFilter ? 'Try adjusting your filters' : 'Add your first product to get started'}</p>
                    {!search && !catFilter && !stockFilter && (
                      <Link to="/products/new" className="btn btn-primary btn-sm">
                        <Plus size={14} /> Add Product
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              products.map(p => (
                <tr key={p._id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    {p.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 4 }}>
                      {p.sku}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.category?.name || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>₹{p.costPrice?.toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 500 }}>₹{p.sellingPrice?.toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{
                      fontWeight: 600,
                      color: p.stock === 0 ? 'var(--danger)' : p.stock <= p.reorderThreshold ? 'var(--warning)' : 'var(--text-primary)'
                    }}>
                      {p.stock}
                    </span>
                  </td>
                  <td><StockBadge stock={p.stock} threshold={p.reorderThreshold} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link to={`/products/${p._id}/edit`} className="btn btn-secondary btn-sm btn-icon" title="Edit">
                        <Edit2 size={14} />
                      </Link>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Deactivate"
                        onClick={() => setDeleteId(p._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
            const p = i + 1;
            return (
              <button key={p} className={`pagination-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                {p}
              </button>
            );
          })}
          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
                Deactivate Product
              </h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to deactivate this product? It will be hidden from new sales but existing invoices remain valid.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                id="confirm-delete-btn"
                className={`btn btn-danger ${deleting ? 'btn-loading' : ''}`}
                disabled={deleting}
                onClick={handleDelete}
              >
                {!deleting && 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
