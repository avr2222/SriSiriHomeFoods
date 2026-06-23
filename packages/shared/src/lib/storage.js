/* ============================================================
   Sri Siri Home Foods — product photo upload (Supabase Storage)
   ============================================================ */
import { supabase } from '../supabase/client.js';

const BUCKET = 'product-photos';

export async function uploadProductPhoto(file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
