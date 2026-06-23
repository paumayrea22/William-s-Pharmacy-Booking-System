import { createClient } from '@supabase/supabase-js';

// Retrieve credentials injected by Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail-fast firewall: Prevent app startup if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables in the .env.local file');
}

// Export the instantiated connection
export const supabase = createClient(supabaseUrl, supabaseAnonKey);