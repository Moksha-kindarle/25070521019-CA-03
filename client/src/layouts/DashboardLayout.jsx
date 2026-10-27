import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  FileText, BarChart3, User, LogOut, Menu, X,
  Bell, ChevronDown, Zap
} from 'lucide-react';
import './DashboardLayout.css';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products',   icon: Package,         label: 'Products' },
  { to: '/inventory',  icon: Warehouse,        label: 'Inventory' },
  { to: '/billing',    icon: ShoppingCart,     label: 'Billing / POS' },
  { to: '/invoices',   icon: FileText,         label: 'Invoices' },
  { to: '/reports',    icon: BarChart3,         label: 'Reports' },
  { to: '/profile',    icon: User,             label: 'Profile' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast('Logged out successfully', 'success');
    navigate('/');
  };

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Zap size={18} />
          </div>
          <span className="logo-text">StockPilot</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item nav-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="dashboard-main">
        {/* Topbar */}
        <header className="topbar">
          <button className="topbar-menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="topbar-brand">
            <Zap size={16} />
            <span>StockPilot</span>
          </div>

          <div className="topbar-right">
            <button className="btn btn-ghost btn-icon topbar-btn" title="Notifications">
              <Bell size={18} />
            </button>
            <div className="topbar-user">
              <div className="user-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="user-name">{user?.name || 'User'}</span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
