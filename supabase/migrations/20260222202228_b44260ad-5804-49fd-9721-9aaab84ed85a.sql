
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fal_api_key text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS make_webhook_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_api_key text;
