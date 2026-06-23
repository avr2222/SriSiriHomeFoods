/* ============================================================
   Owner/admin login — email + password only.
   Access is gated on the admin role after sign-in (no self-signup).
   ============================================================ */
import { useState } from 'react';
import { Icon, useAuth } from '@sri/shared';

export default function OwnerLogin() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit() {
    setBusy(true); setErr('');
    const r = await signInWithEmail(email, password);
    setBusy(false);
    if (!r.ok) setErr(r.error?.message || 'Invalid email or password');
    // on success, App re-renders via auth state and applies the admin gate
  }

  const canSubmit = email.includes('@') && password.length >= 6 && !busy;
  return (
    <div className="auth-loading" style={{ flexDirection: 'column' }}>
      <div className="card" style={{ width: 'min(380px, 92vw)', padding: '30px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--saffron)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 19 }}>S</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Owner Cockpit</div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Sri Siri Home Foods</div>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Sign in</div>
        <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 18 }}>Use your admin email and password.</div>
        <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" onKeyDown={e => { if (e.key === 'Enter' && canSubmit) onSubmit(); }} /></div>
        <button className="btn block" disabled={!canSubmit} onClick={onSubmit} style={{ marginTop: 6 }}>{busy ? 'Signing in…' : 'Sign in'}<Icon name="chevR" size={16} /></button>
        {err ? <div style={{ color: 'var(--err)', fontSize: 12.5, marginTop: 12, textAlign: 'center' }}>{err}</div> : null}
      </div>
    </div>
  );
}
