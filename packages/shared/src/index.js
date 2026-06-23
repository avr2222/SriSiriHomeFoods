/* ============================================================
   Sri Siri Home Foods — shared package public API
   ============================================================ */
export { default as Icon } from './components/Icon.jsx';
export { supabase, fmt } from './supabase/client.js';
export { AuthProvider, useAuth } from './hooks/useAuth.jsx';
export { useStore } from './hooks/useStore.jsx';
export { useCart } from './lib/cart.js';
export { uploadProductPhoto } from './lib/storage.js';
export { toCSV, downloadCSV } from './lib/csv.js';
export * as seed from './data/seed.js';
