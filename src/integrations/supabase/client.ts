import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Deine manuelle Enterprise-Verbindung
const SUPABASE_URL = "https://kuqgkivyyauodsgvfyn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_HlSgtimqc97jN34a3yi1zQ_GhMYmjXk";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
