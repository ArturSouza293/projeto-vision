import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for the shared persona library (schema `vision`).
 *
 * Both env vars are public-by-design (NEXT_PUBLIC_*, shipped to the client).
 * When they're absent the app runs fine on localStorage only — every call site
 * guards on `isSupabaseConfigured` / a null client.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      db: { schema: "vision" },
      auth: { persistSession: false },
    })
  : null;
