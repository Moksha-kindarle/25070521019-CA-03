import React from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, ArrowRight, Package, Warehouse, ShoppingCart,
  FileText, BarChart3, TrendingUp, Shield, ChevronRight
} from 'lucide-react';
import './Landing.css';

const features = [
  { icon: Package,     title: 'Product Catalogue',   desc: 'Manage your entire product inventory with SKUs, pricing, categories, and reorder thresholds.' },
  { icon: Warehouse,   title: 'Stock Control',        desc: 'Track stock-in, stock-out and adjustments with a complete movement history and audit trail.' },
  { icon: ShoppingCart,title: 'Billing & POS',        desc: 'Create invoices instantly with our smart cart. Prices and stock are validated server-side.' },
  { icon: FileText,    title: 'Invoice Management',   desc: 'Browse, print and manage your full invoice history. Persistent even after product changes.' },
  { icon: BarChart3,   title: 'Analytics & Reports',  desc: 'Date-filtered sales reports, top-selling products and stock summaries at a glance.' },
  { icon: Shield,      title: 'Secure & Reliable',    desc: 'Server-side session auth, hashed passwords, transaction safety and atomic stock updates.' },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-icon">
              <Zap size={16} />
            </div>
            <span>StockPilot</span>
          </div>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how">How It Works</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-secondary btn-sm">Log in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow hero-glow-left" />
        <div className="hero-glow hero-glow-right" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge badge-purple">
              <Zap size={11} /> New&nbsp;&nbsp;Inventory SaaS Platform
            </span>
          </div>
          <h1 className="hero-headline">
            Streamline Inventory<br />
            <span className="gradient-text">with StockPilot</span>
          </h1>
          <p className="hero-sub">
            A premium inventory and billing management platform that tracks stock,
            manages products, creates invoices and delivers real-time analytics — all in one place.
          </p>
          <div className="hero-ctas">
            <Link to="/signup" className="btn btn-primary" style={{ fontSize: '1rem', height: 50, padding: '0 28px' }}>
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ fontSize: '1rem', height: 50 }}>
              View Dashboard
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-value">Real-time</span>
              <span className="stat-label">Stock tracking</span>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <span className="stat-value">Atomic</span>
              <span className="stat-label">Transactions</span>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <span className="stat-value">Secure</span>
              <span className="stat-label">Session auth</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="hero-preview">
          <div className="preview-card">
            <div className="preview-topbar">
              <div className="preview-dots">
                <span /><span /><span />
              </div>
              <div className="preview-title">StockPilot — Dashboard</div>
            </div>
            <div className="preview-body">
              <div className="preview-kpis">
                {[
                  { label: 'Total Products', value: '248', color: 'var(--accent-violet)' },
                  { label: 'Inventory Value', value: '₹4.2L', color: 'var(--accent-pink)' },
                  { label: "Today's Sales", value: '₹18,450', color: 'var(--success)' },
                  { label: 'Low Stock Alerts', value: '7', color: 'var(--warning)' },
                ].map(k => (
                  <div key={k.label} className="preview-kpi" style={{ '--kpi-color': k.color }}>
                    <div className="preview-kpi-value">{k.value}</div>
                    <div className="preview-kpi-label">{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="preview-chart">
                {[60, 80, 55, 90, 70, 95, 75, 85, 65, 88, 78, 92].map((h, i) => (
                  <div key={i} className="preview-bar" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <div className="logo-icon" style={{ margin: '0 auto 20px' }}>
              <Zap size={18} />
            </div>
            <h2>Everything You Need to Run Your Business</h2>
            <p>All the tools to manage inventory, billing and analytics — in one beautifully crafted platform.</p>
          </div>
          <div className="features-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card card">
                <div className="feature-icon">
                  <f.icon size={22} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="feature-link">
                  Learn more <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow" />
        <div className="section-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="cta-content">
            <h2>Ready to Take Control of Your Inventory?</h2>
            <p>Sign up in seconds. No credit card required. Start managing smarter today.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/signup" className="btn btn-primary" style={{ fontSize: '1rem', height: 50, padding: '0 32px' }}>
                Create Free Account <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-icon" style={{ width: 28, height: 28 }}>
              <Zap size={13} />
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              © 2025 StockPilot. All rights reserved.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Link to="/login">Login</Link>
            <Link to="/signup">Signup</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
