import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usersApi } from '../services/api.js';
import { User, Lock, Save, Loader } from 'lucide-react';

export default function ProfilePage() {
  const { user, refetch } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '' });
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    if (user) setForm({ name: user.name || '', email: user.email || '' });
  }, [user]);

  const handleProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSavingProfile(true);
    try {
      await usersApi.updateProfile({ name: form.name.trim() });
      await refetch();
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.current) errs.current = 'Enter your current password';
    if (!pw.newPw || pw.newPw.length < 8) errs.newPw = 'New password must be at least 8 characters';
    if (pw.newPw !== pw.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setSavingPw(true);
    try {
      await usersApi.changePassword({ currentPassword: pw.current, newPassword: pw.newPw });
      toast('Password changed successfully', 'success');
      setPw({ current: '', newPw: '', confirm: '' });
      setPwErrors({});
    } catch (err) {
      toast(err.message || 'Failed to change password', 'error');
      if (err.status === 401) setPwErrors({ current: 'Incorrect current password' });
    } finally {
      setSavingPw(false);
    }
  };

  const setP = (field) => (e) => {
    setPw(f => ({ ...f, [field]: e.target.value }));
    setPwErrors(er => ({ ...er, [field]: undefined }));
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Profile & Settings</h1>
          <p>Manage your account information</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 700, color: 'white'
          }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.125rem' }}>{user?.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</div>
            <span className="badge badge-purple" style={{ marginTop: 4 }}>{user?.role || 'user'}</span>
          </div>
        </div>

        <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', marginBottom: 16 }}>
          <User size={16} /> Personal Information
        </h4>
        <form onSubmit={handleProfile}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">Full Name</label>
              <input id="profile-name" type="text" className="form-input"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-email">Email Address</label>
              <input id="profile-email" type="email" className="form-input" value={form.email} disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              <span className="form-hint">Email cannot be changed</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" id="save-profile-btn"
                className={`btn btn-primary btn-sm ${savingProfile ? 'btn-loading' : ''}`}
                disabled={savingProfile}>
                {!savingProfile && <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', marginBottom: 20 }}>
          <Lock size={16} /> Change Password
        </h4>
        <form onSubmit={handlePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="pw-current">Current Password</label>
              <input id="pw-current" type="password" className={`form-input ${pwErrors.current ? 'error' : ''}`}
                value={pw.current} onChange={setP('current')} placeholder="Your current password" />
              {pwErrors.current && <span className="form-error">{pwErrors.current}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pw-new">New Password</label>
              <input id="pw-new" type="password" className={`form-input ${pwErrors.newPw ? 'error' : ''}`}
                value={pw.newPw} onChange={setP('newPw')} placeholder="Min 8 characters" />
              {pwErrors.newPw && <span className="form-error">{pwErrors.newPw}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pw-confirm">Confirm New Password</label>
              <input id="pw-confirm" type="password" className={`form-input ${pwErrors.confirm ? 'error' : ''}`}
                value={pw.confirm} onChange={setP('confirm')} placeholder="Repeat new password" />
              {pwErrors.confirm && <span className="form-error">{pwErrors.confirm}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" id="change-pw-btn"
                className={`btn btn-primary btn-sm ${savingPw ? 'btn-loading' : ''}`}
                disabled={savingPw}>
                {!savingPw && <><Lock size={14} /> Update Password</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
