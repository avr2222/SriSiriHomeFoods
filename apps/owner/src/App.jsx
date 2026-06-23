/* ============================================================
   Owner app root — email/password login gated on admin role.
   ============================================================ */
import { useStore, useAuth } from '@sri/shared';
import OwnerApp from './OwnerApp.jsx';
import OwnerLogin from './OwnerLogin.jsx';

export default function App() {
  const { loading, user, isAdmin, signOut } = useAuth();
  const store = useStore({ owner: true });

  if (loading) return <div className="auth-loading">Loading…</div>;

  if (!user) return <OwnerLogin />;

  if (!isAdmin) {
    return (
      <div className="auth-loading" style={{ flexDirection: 'column', gap: 14, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>This account isn’t an admin</div>
        <div>Ask a super admin to grant access, then sign in again.</div>
        <button className="btn ghost" onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="app-stage">
      <OwnerApp store={store} />
    </div>
  );
}
