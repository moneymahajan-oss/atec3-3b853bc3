// Separate Supabase client for the Admin panel so its auth session is
// isolated from the CRM client (different localStorage key).
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import like:
// import { supabaseAdmin } from "@/integrations/supabase/adminClient";

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    storageKey: 'admin-auth-token',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    // Use a no-op lock to prevent contention with the main client's navigator lock
    lock: (name: string, acquireTimeout: number, fn: () => Promise<any>) => fn(),
  }
});
