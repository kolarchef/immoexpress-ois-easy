import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Diese Funktion ist dein "Postbote" zu Make.com
export async function callWebhook(action: string, payload: any = {}) {
  const WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL;

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "ImmoExpress-Clever",
      timestamp: new Date().toISOString(),
      action: action,
      ...payload,
    }),
  });
  return response.text();
}

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/launchpad", { replace: true });
  }, [navigate]);

  return null;
};

export default Index;
