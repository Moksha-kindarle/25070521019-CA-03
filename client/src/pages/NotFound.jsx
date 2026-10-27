import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Zap } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      flexDirection: 'column',
      textAlign: 'center',
      gap: 24,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: 'var(--accent-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--glow-violet)', marginBottom: 8,
      }}>
        <Zap size={36} color="white" />
      </div>
      <div style={{ fontSize: '8rem', fontFamily: 'var(--font-heading)', fontWeight: 900, lineHeight: 1,
        background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text' }}>
        404
      </div>
      <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> Go to Home
        </Link>
        <Link to="/dashboard" className="btn btn-secondary">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
