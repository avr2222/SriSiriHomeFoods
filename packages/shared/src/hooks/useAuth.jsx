/* ============================================================
   Sri Siri Home Foods — auth context (Supabase email + Google)
   Roles: customer (default) · super_admin (cockpit) · owner/worker (future)
   ============================================================ */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/client.js';

const AuthCtx = createContext(null);
const ADMIN_ROLES = ['owner', 'super_admin'];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user?.id).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadProfile(s?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signUpWithEmail = useCallback(async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: (name || '').trim() } },
    });
    if (error) return { ok: false, error };
    // When "Confirm email" is enabled, signUp returns no active session.
    const needsConfirm = !data.session;
    if (!needsConfirm) await loadProfile(data.user?.id);
    return { ok: true, needsConfirm };
  }, [loadProfile]);

  const signInWithEmail = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error };
    await loadProfile(data.session?.user?.id);
    return { ok: true };
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { ok: !error, error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const role = profile?.role || null;
  const value = {
    session,
    user: session?.user || null,
    profile,
    role,
    loading,
    isAdmin: ADMIN_ROLES.includes(role),
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
