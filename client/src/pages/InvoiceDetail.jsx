import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { salesApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Printer, ArrowLeft, XCircle, Loader, AlertTriangle } from 'lucide-react';
import './InvoiceDetail.css';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const printRef = useRef(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    salesApi.get(id)
      .then(r => setInvoice(r.data))
      .catch(e => { toast(e.message || 'Failed to load invoice', 'error'); navigate('/invoices'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await salesApi.cancel(id);
      toast('Invoice cancelled and stock reversed', 'success');
      setShowCancel(false);
      const r = await salesApi.get(id);
      setInvoice(r.data);
    } catch (e) {
      toast(e.message || 'Cancellation failed', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Loader size={36} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--accent-violet)' }} />
    </div>
  );

  if (!invoice) return null;

  const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="animate-fade-in">
      {/* Actions Bar (no-print) */}
      <div className="page-header no-print">
        <div className="page-header-left">
          <h1>Invoice #{invoice.invoiceNumber || invoice._id.slice(-8).toUpperCase()}</h1>
          <p>{new Date(invoice.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
        </div>
        <div className="page-header-actions">
          <Link to="/invoices" className="btn btn-secondary btn-sm">
            <ArrowLeft size={15} /> Back
          </Link>
          {invoice.status === 'completed' && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowCancel(true)}>
              <XCircle size={15} /> Cancel Invoice
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handlePrint} id="print-invoice-btn">
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="invoice-doc card" ref={printRef}>
        {/* Header */}
        <div className="invoice-doc-header">
          <div>
            <div className="invoice-brand">⚡ StockPilot</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              Inventory & Billing Management
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="invoice-number">
              INVOICE #{invoice.invoiceNumber || invoice._id.slice(-8).toUpperCase()}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              {new Date(invoice.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className={`badge ${invoice.status === 'completed' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                {invoice.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Info Row */}
        <div className="invoice-info-row">
          <div className="invoice-info-card">
            <div className="invoice-info-label">Billed By</div>
            <div className="invoice-info-value">{invoice.createdBy?.name || 'Staff'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{invoice.createdBy?.email}</div>
          </div>
          {invoice.notes && (
            <div className="invoice-info-card">
              <div className="invoice-info-label">Notes</div>
              <div className="invoice-info-value" style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{invoice.notes}</div>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="table-wrapper" style={{ marginBottom: 24 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>SKU</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{item.productName || item.product?.name}</td>
                  <td><code style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{item.sku || item.product?.sku}</code></td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.priceAtSale)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.priceAtSale * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="invoice-totals">
          <div className="totals-box">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{fmt(invoice.subtotal)}</span>
            </div>
            <div className="total-row">
              <span>GST (18%)</span>
              <span>{fmt(invoice.tax)}</span>
            </div>
            <div className="divider" style={{ margin: '10px 0' }} />
            <div className="total-row total-grand">
              <span>Grand Total</span>
              <span style={{ color: 'var(--accent-violet)' }}>{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="invoice-footer">
          <span>Generated by StockPilot — Inventory & Billing Management System</span>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancel && (
        <div className="modal-overlay no-print" onClick={() => setShowCancel(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
                Cancel Invoice
              </h3>
            </div>
            <div className="modal-body">
              <p>This will cancel the invoice and <strong>reverse the stock deductions</strong> for all items. This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCancel(false)}>Keep Invoice</button>
              <button
                id="confirm-cancel-btn"
                className={`btn btn-danger ${cancelling ? 'btn-loading' : ''}`}
                disabled={cancelling}
                onClick={handleCancel}
              >
                {!cancelling && 'Cancel Invoice & Reverse Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
