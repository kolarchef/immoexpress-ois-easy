import { supabase } from "@/integrations/supabase/client";

const FALLBACK_WEBHOOK_URL = "https://hook.eu1.make.com/bj8cwjpk7enhlirypnj3es0wfa3upl2c";

/**
 * Loads the Make.com webhook URL from the user's profile.
 * Falls back to a default URL if the profile field is empty.
 */
export async function getWebhookUrl(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("make_webhook_url")
    .eq("user_id", userId)
    .single();

  const url = (profile as any)?.make_webhook_url;
  return url && url.trim() ? url.trim() : FALLBACK_WEBHOOK_URL;
}
