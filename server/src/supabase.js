import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdmin({ supabaseUrl, supabaseSecretKey }) {
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
