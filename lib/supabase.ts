import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const env = (import.meta.env || {}) as any;

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://wzsyvaztnhofjgzgtkwf.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'sb_secret_RVaYerEYSkIbMalncujxhQ_FKP7ewK6';

if (supabaseAnonKey === 'missing-anon-key-placeholder') {
  console.warn('WARNING: Supabase Anon Key is missing in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true, // TRUE: Let Supabase SDK handle the OAuth hash parsing automatically
    persistSession: true,
    autoRefreshToken: true,
  }
});