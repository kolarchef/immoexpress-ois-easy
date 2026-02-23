// Diese Funktion ist dein "Postbote" zu Make.com
async function callWebhook(action: string, payload: any = {}) {
  const WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL;

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "ImmoExpress-Clever",
      timestamp: new Date().toISOString(),
      action: action, // Hier steht dann z.B. "generate_pdf"
      ...payload,
    }),
  });
  return response.text();
}
