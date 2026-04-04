import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente público (respeta RLS)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente del servidor (bypasea RLS) - Solo usar en endpoints API del servidor
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
