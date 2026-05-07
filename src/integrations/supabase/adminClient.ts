// Separate Supabase client for Admin panel data operations.
// It must not persist or refresh auth, otherwise it can contend with the main auth client lock.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import like:
// import { supabaseAdmin } from "@/integrations/supabase/adminClient";

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'sb-admin-auth',
  }
});
