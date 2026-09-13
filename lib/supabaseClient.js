import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

function looksValid(u) {
  return /^https?:\/\/.+\..+/.test(u) && !u.includes("your-project");
}

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey && looksValid(supabaseUrl));

let client = null;
if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    client = null;
  }
}

export const supabase = client;
