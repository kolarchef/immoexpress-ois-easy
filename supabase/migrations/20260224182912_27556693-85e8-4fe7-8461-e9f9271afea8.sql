
-- 1. App-Rollen Enum
CREATE TYPE public.app_role AS ENUM ('admin', 'makler');

-- 2. User-Roles Tabelle
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'makler',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security Definer Funktion um Rekursion zu vermeiden
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: Jeder kann seine eigene Rolle sehen
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins können alle Rollen sehen
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Tresor Notizen (nur für Admins sichtbar)
CREATE TABLE public.finanz_tresor_notizen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id uuid NOT NULL REFERENCES public.crm_kunden(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  notiz text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finanz_tresor_notizen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tresor notizen"
  ON public.finanz_tresor_notizen FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Bank-Angebote Uploads (nur für Admins)
CREATE TABLE public.finanz_tresor_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id uuid NOT NULL REFERENCES public.crm_kunden(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dateiname text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finanz_tresor_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tresor uploads"
  ON public.finanz_tresor_uploads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Storage Bucket für Bank-Angebote
INSERT INTO storage.buckets (id, name, public) VALUES ('finanz-tresor', 'finanz-tresor', false);

CREATE POLICY "Admins can upload to finanz-tresor"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'finanz-tresor' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read finanz-tresor"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'finanz-tresor' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete from finanz-tresor"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'finanz-tresor' AND public.has_role(auth.uid(), 'admin'));

-- Trigger für updated_at
CREATE TRIGGER update_finanz_tresor_notizen_updated_at
  BEFORE UPDATE ON public.finanz_tresor_notizen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
