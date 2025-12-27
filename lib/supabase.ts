
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const env = (import.meta.env || {}) as any;

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://wzsyvaztnhofjgzgtkwf.supabase.co';

// UPDATED: Using the correct Anon Key provided
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6c3l2YXp0bmhvZmpnemd0a3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTUyMDMsImV4cCI6MjA4MjQzMTIwM30.ut9x0jgMiZwl6lsG8ree5n7NpAgOvFPGQpO0qkrE5MU';

if (supabaseAnonKey.startsWith('sb_secret')) {
  console.warn('WARNING: It looks like you are using a Service Role Secret (sb_secret...) instead of the Anon Key. This may cause connection issues.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true, // FIXED: Set to true so Supabase handles the OAuth redirect hash automatically
    persistSession: true,
    autoRefreshToken: true,
  }
});
