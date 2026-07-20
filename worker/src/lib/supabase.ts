import { createClient } from "@supabase/supabase-js";
import type { Env } from "../types";

let client: ReturnType<typeof createClient> | null = null;

export function supabase(env: Env) {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export const getSupabase = supabase;
