import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { salesApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { FileText, Search, RefreshCw, ChevronLeft, ChevronRight, Eye, XCircle } from 'lucide-react';

const LIMIT = 20;

export default function InvoicesPage() {
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (status) params.status = status;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await salesApi.list(params);
      setInvoices(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast(e.message || 'Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, dateFrom, dateTo]);

  const totalPages = Math.ceil(total / LIMIT);

  const StatusBadge = ({ status }) => {
    const map = {
      completed: 'badge-success',
      cancelled: 'badge-danger',
      pending: 'badge-warning',
    };
    return <span className={`badge ${map[status] || 'badge-info'}`}>{status}</span>;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Invoices</h1>
          <p>{total} invoices total</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={15} /></button>
          <Link to="/billing" className="btn btn-primary btn-sm">New Sale</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div className="filters-row">
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input className="form-input" id="invoice-search" placeholder="Search invoice #..."
              value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
          </div>
          <select className="form-select" style={{ width: 160, height: 44 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" className="form-input" style={{ width: 160, height: 44 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="form-input" style={{ width: 160, height: 44 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Items</th>
              <th>Subtotal</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 16, width: '75%', borderRadius: 4 }} /></td>
                ))}</tr>
              ))
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <FileText size={40} />
                  <h3>No invoices yet</h3>
                  <p>Create your first sale from the Billing page</p>
                  <Link to="/billing" className="btn btn-primary btn-sm">Open POS</Link>
                </div>
              </td></tr>
            ) : invoices.map(inv => (
              <tr key={inv._id}>
                <td>
                  <code style={{ fontSize: '0.85rem', color: 'var(--accent-violet)' }}>
                    #{inv.invoiceNumber || inv._id.slice(-8).toUpperCase()}
                  </code>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {new Date(inv.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td>{inv.items?.length || 0} items</td>
                <td>₹{inv.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ color: 'var(--text-muted)' }}>₹{inv.tax?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ fontWeight: 600 }}>₹{inv.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td>
                  <Link to={`/invoices/${inv._id}`} className="btn btn-secondary btn-sm btn-icon" title="View">
                    <Eye size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
