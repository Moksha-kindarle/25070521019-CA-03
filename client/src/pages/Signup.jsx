import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Zap, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import './Auth.css';

export default function SignupPage() {
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const pwStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = pwStrength(form.password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)'];

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await signup({ name: form.name.trim(), email: form.email, password: form.password });
      toast('Account created! Welcome to StockPilot.', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.message || 'Signup failed', 'error');
      if (err.status === 409) setErrors({ email: 'An account with this email already exists' });
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: undefined }));
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />

      <div className="auth-card animate-slide-up">
        <div className="auth-logo">
          <div className="logo-icon">
            <Zap size={18} />
          </div>
          <span>StockPilot</span>
        </div>

        <div className="auth-header">
          <h1>Create your account</h1>
          <p>Start managing your inventory for free</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-fields">
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="Your full name"
                value={form.name}
                onChange={set('name')}
                autoComplete="name"
                autoFocus
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">Email address</label>
              <input
                id="signup-email"
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@company.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">Password</label>
              <div className="input-password">
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPass(s => !s)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="pw-strength">
                  <div className="pw-bars">
                    {[1,2,3,4].map(i => (
                      <div
                        key={i}
                        className="pw-bar"
                        style={{ background: i <= strength ? strengthColors[strength] : 'var(--border-default)' }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-confirm">Confirm password</label>
              <input
                id="signup-confirm"
                type="password"
                className={`form-input ${errors.confirmPassword ? 'error' : form.confirmPassword && form.confirmPassword === form.password ? 'success' : ''}`}
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              {form.confirmPassword && form.confirmPassword === form.password && !errors.confirmPassword && (
                <span className="form-hint" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={13} /> Passwords match
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            id="signup-submit"
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {!loading && 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>

        <Link to="/" className="auth-back">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>
    </div>
  );
}
