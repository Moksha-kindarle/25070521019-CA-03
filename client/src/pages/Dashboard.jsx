import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api.js';
import {
  Package, TrendingUp, DollarSign, AlertTriangle,
  ArrowUp, ArrowDown, RefreshCw, Plus, ShoppingCart
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import './Dashboard.css';

function KPICard({ label, value, change, positive, icon: Icon, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: `${color}18`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {change !== undefined && (
          <div className={`kpi-change ${positive ? 'positive' : 'negative'}`}>
            {positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {change}
          </div>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: 8, padding: '10px 14px',
      fontSize: '0.8125rem', color: 'var(--text-primary)'
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, a] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.trends(),
        dashboardApi.alerts(),
      ]);
      setSummary(s.data);
      setTrends(t.data || []);
      setAlerts(a.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="dashboard-loading">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 116, borderRadius: 16 }} />
      ))}
    </div>
  );

  if (error) return (
    <div className="empty-state">
      <AlertTriangle size={48} />
      <h3>Failed to load dashboard</h3>
      <p>{error}</p>
      <button className="btn btn-primary" onClick={load}>
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  );

  const fmt = (v) => v !== undefined ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
  const fmtN = (v) => v !== undefined ? Number(v).toLocaleString('en-IN') : '—';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening today.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
          <Link to="/billing" className="btn btn-primary btn-sm">
            <ShoppingCart size={15} /> New Sale
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          label="Total Products"
          value={fmtN(summary?.totalProducts)}
          change={`${summary?.newProductsThisMonth || 0} this month`}
          positive={true}
          icon={Package}
          color="var(--accent-violet)"
        />
        <KPICard
          label="Inventory Value"
          value={fmt(summary?.inventoryValue)}
          icon={DollarSign}
          color="var(--accent-pink)"
        />
        <KPICard
          label="Today's Revenue"
          value={fmt(summary?.todayRevenue)}
          change={summary?.revenueChangeText || ''}
          positive={summary?.revenueChangePositive}
          icon={TrendingUp}
          color="var(--success)"
        />
        <KPICard
          label="Low Stock Alerts"
          value={fmtN(summary?.lowStockCount)}
          change={summary?.lowStockCount > 0 ? 'Needs attention' : 'All good'}
          positive={summary?.lowStockCount === 0}
          icon={AlertTriangle}
          color={summary?.lowStockCount > 0 ? 'var(--warning)' : 'var(--success)'}
        />
      </div>

      {/* Charts Row */}
      <div className="dashboard-charts">
        <div className="card chart-card">
          <div className="chart-header">
            <div>
              <h3>Revenue Trends</h3>
              <p style={{ fontSize: '0.8125rem', marginTop: 2 }}>Last 7 days</p>
            </div>
          </div>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trends} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#8B5CF6" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p>No sales data yet. Start billing to see trends.</p>
            </div>
          )}
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <div>
              <h3>Sales Volume</h3>
              <p style={{ fontSize: '0.8125rem', marginTop: 2 }}>Invoices per day</p>
            </div>
          </div>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trends} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Invoices" fill="#E879F9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p>No invoices yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="dashboard-bottom">
        <div className="card">
          <div className="chart-header" style={{ marginBottom: 16 }}>
            <h3>Low Stock Alerts</h3>
            <Link to="/inventory" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {alerts.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <Package size={36} />
              <p>All products are well stocked!</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Reorder At</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.sku}</td>
                      <td>
                        <span style={{ color: p.stock === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
                          {p.stock}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.reorderThreshold}</td>
                      <td>
                        <span className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                          {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                      <td>
                        <Link to="/inventory" className="btn btn-secondary btn-sm">
                          <Plus size={13} /> Restock
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="chart-header" style={{ marginBottom: 16 }}>
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions">
            <Link to="/products/new" className="quick-action-item">
              <div className="qa-icon" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--accent-violet)' }}>
                <Package size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Add Product</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Create a new product</div>
              </div>
            </Link>
            <Link to="/billing" className="quick-action-item">
              <div className="qa-icon" style={{ background: 'rgba(232,121,249,0.12)', color: 'var(--accent-pink)' }}>
                <ShoppingCart size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>New Sale</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Open the POS</div>
              </div>
            </Link>
            <Link to="/inventory" className="quick-action-item">
              <div className="qa-icon" style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--success)' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Adjust Stock</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Record movements</div>
              </div>
            </Link>
            <Link to="/reports" className="quick-action-item">
              <div className="qa-icon" style={{ background: 'rgba(96,165,250,0.12)', color: 'var(--info)' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>View Reports</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sales analytics</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
