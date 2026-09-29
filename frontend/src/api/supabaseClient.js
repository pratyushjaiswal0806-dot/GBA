import { createClient } from '@supabase/supabase-js';

function requirePublicSetting(name) {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required frontend setting: ${name}. Set it in frontend/.env.`);
  }

  return value;
}

export const supabase = createClient(
  requirePublicSetting('VITE_SUPABASE_URL'),
  requirePublicSetting('VITE_SUPABASE_ANON_KEY')
);
