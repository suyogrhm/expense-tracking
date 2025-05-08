import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase URL or Anon Key is missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file (for local development) and in Vercel environment variables (for deployment).'
  );
  // You might want to throw an error here in a real app or handle it gracefully
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);