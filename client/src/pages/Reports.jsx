import React, { useState, useEffect } from 'react';
import { reportsApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { RefreshCw, Download, TrendingUp, Package, DollarSign } from 'lucide-react';

const COLORS = ['#8B5CF6', '#E879F9', '#34D399', '#60A5FA', '#FBBF24', '#F87171'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8125rem' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>₹{Number(p.value).toLocaleString('en-IN')}</p>)}
    </div>
  );
};

export default function ReportsPage() {
  const toast = useToast();
  const today = new Date();
  const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(fmt(thirtyDaysAgo));
  const [dateTo, setDateTo] = useState(fmt(today));
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [stockSummary, setStockSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t, st] = await Promise.all([
        reportsApi.sales({ dateFrom, dateTo }),
        reportsApi.topProducts({ dateFrom, dateTo }),
        reportsApi.stock(),
      ]);
      setSalesData(s.data || []);
      setTopProducts(t.data || []);
      setStockSummary(st.data);
    } catch (e) {
      toast(e.message || 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalRevenue = salesData.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalInvoices = salesData.reduce((s, d) => s + (d.count || 0), 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports & Analytics</h1>
          <p>Sales, revenue and inventory insights</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <label className="form-label" style={{ margin: 0 }}>From:</label>
          <input type="date" className="form-input" style={{ width: 160, height: 42 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <label className="form-label" style={{ margin: 0 }}>To:</label>
          <input type="date" className="form-input" style={{ width: 160, height: 42 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={load}>Apply Filters</button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'var(--accent-violet)' },
          { label: 'Total Invoices', value: totalInvoices, icon: TrendingUp, color: 'var(--accent-pink)' },
          { label: 'Avg. Invoice Value', value: totalInvoices > 0 ? `₹${(totalRevenue / totalInvoices).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—', icon: Package, color: 'var(--success)' },
        ].map(k => (
          <div key={k.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
              <k.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '—' : k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>Daily Revenue</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 8 }} /> : salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: '40px 20px' }}><p>No data for selected period</p></div>}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>Daily Invoice Volume</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 8 }} /> : salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Invoices" fill="#E879F9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: '40px 20px' }}><p>No data for selected period</p></div>}
        </div>
      </div>

      {/* Top Products & Stock Summary */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>Top Selling Products</h3>
          {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 8 }} /> : topProducts.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={topProducts} dataKey="totalQty" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={0}>
                    {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} units`, 'Sold']} />
                  <Legend formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="table-wrapper" style={{ marginTop: 16 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'right' }}>Units Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.slice(0, 5).map((p, i) => (
                      <tr key={p._id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.totalQty}</td>
                        <td style={{ textAlign: 'right' }}>₹{p.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="empty-state" style={{ padding: 32 }}><p>No sales data for this period</p></div>}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>Stock Summary</h3>
          {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 8 }} /> : stockSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Total Products', value: stockSummary.totalProducts, color: 'var(--accent-violet)' },
                { label: 'Total Stock Units', value: stockSummary.totalStock?.toLocaleString('en-IN'), color: 'var(--info)' },
                { label: 'Total Inventory Value', value: `₹${stockSummary.inventoryValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: 'var(--success)' },
                { label: 'Low Stock Items', value: stockSummary.lowStockCount, color: 'var(--warning)' },
                { label: 'Out of Stock Items', value: stockSummary.outOfStockCount, color: 'var(--danger)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: row.color }}>{row.value ?? '—'}</span>
                </div>
              ))}
            </div>
          ) : <div className="empty-state" style={{ padding: 32 }}><p>Unable to load stock summary</p></div>}
        </div>
      </div>
    </div>
  );
}
