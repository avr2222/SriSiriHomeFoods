/* ============================================================
   Sri Siri Home Foods — Supabase browser client
   Reads Vite env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
   ============================================================ */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Surface a clear message during dev instead of a cryptic network error.
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — set them in the app .env file.');
}

export const supabase = createClient(url || 'http://localhost', anon || 'public-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
