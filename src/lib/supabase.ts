import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client — used only when NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set (the anon key is public by design and is
 * protected by RLS policies in supabase/schema.sql). Without them the app runs on
 * the in-browser demo repository in src/lib/store.tsx.
 * Never put the service-role key or other secrets in NEXT_PUBLIC_* variables.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}

export const isSupabaseConfigured = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
