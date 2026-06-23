/* ============================================================
   Customer app root — Supabase-backed store, no role switch.
   ============================================================ */
import { useStore, useAuth } from '@sri/shared';
import CustomerApp from './CustomerApp.jsx';

export default function App() {
  const { loading } = useAuth();
  const store = useStore({ owner: false });

  if (loading) return <div className="auth-loading">Loading…</div>;

  return <CustomerApp store={store} />;
}
