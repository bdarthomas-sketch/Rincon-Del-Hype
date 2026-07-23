import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | null = null;

export function supabase(env: Env) {
  if (!client) {
    client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export const getSupabase = supabase;
