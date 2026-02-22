
-- Add ElevenLabs API Key and Webhook URL fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS elevenlabs_api_key text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS video_webhook_url text DEFAULT NULL;
