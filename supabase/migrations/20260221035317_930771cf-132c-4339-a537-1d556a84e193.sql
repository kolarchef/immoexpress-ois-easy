
-- 1. Profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  imap_user TEXT,
  imap_password TEXT,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Zinshaus tracker table
CREATE TABLE public.zinshaeuser (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adresse TEXT NOT NULL,
  bezirk TEXT,
  m2_preis NUMERIC,
  rendite_prozent NUMERIC,
  kaufpreis NUMERIC,
  baujahr INTEGER,
  notiz TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zinshaeuser ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own zinshaeuser" ON public.zinshaeuser
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own zinshaeuser" ON public.zinshaeuser
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own zinshaeuser" ON public.zinshaeuser
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own zinshaeuser" ON public.zinshaeuser
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_zinshaeuser_updated_at
  BEFORE UPDATE ON public.zinshaeuser
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Internal messages / notifications table
CREATE TABLE public.nachrichten (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  inhalt TEXT,
  typ TEXT DEFAULT 'system',
  gelesen BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nachrichten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nachrichten" ON public.nachrichten
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own nachrichten" ON public.nachrichten
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nachrichten" ON public.nachrichten
  FOR DELETE USING (auth.uid() = user_id);
