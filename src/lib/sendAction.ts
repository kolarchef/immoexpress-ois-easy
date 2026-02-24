import { getWebhookUrl } from "@/lib/getWebhookUrl";
import { supabase } from "@/integrations/supabase/client";

/**
 * Central action dispatch: sends a standardised payload to Make.com.
 * Labels on UI buttons can change freely – only the actionId matters.
 *
 * Shape:  { action: "<actionId>", payload: { user_id, objekt_id, timestamp, ...extra } }
 */
export async function sendAction(
  actionId: string,
  extra: Record<string, unknown> | object = {},
): Promise<{ ok: boolean; status?: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const webhookUrl = await getWebhookUrl(user.id);

  const body = {
    actionId,
    data: {
      user_id: user.id,
      timestamp: new Date().toISOString(),
      ...extra,
    },
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { ok: res.ok, status: res.status };
}
