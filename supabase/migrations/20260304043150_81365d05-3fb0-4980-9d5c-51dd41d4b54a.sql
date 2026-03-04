
-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vorname TEXT NOT NULL DEFAULT '',
  nachname TEXT NOT NULL DEFAULT '',
  email TEXT,
  mobiltelefon TEXT,
  typ TEXT DEFAULT 'Käufer',
  geburtsdatum DATE,
  einzugsdatum DATE,
  kaufdatum DATE,
  notizen TEXT,
  zustaendigkeit TEXT DEFAULT 'Vertriebsteam Wien',
  status TEXT DEFAULT 'Aktiv',
  budget TEXT,
  ort TEXT,
  sterne INTEGER DEFAULT 3,
  dsgvo_einwilligung BOOLEAN DEFAULT false,
  newsletter_aktiv BOOLEAN DEFAULT true,
  finance_shared BOOLEAN NOT NULL DEFAULT false,
  finance_status TEXT DEFAULT 'offen',
  ablehnungsgrund_bank TEXT,
  objekt_id UUID,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create objects table
CREATE TABLE public.objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT,
  objektnummer TEXT,
  art TEXT,
  vermarktung TEXT DEFAULT 'Kauf',
  bezirk TEXT,
  plz TEXT,
  ort TEXT,
  strasse TEXT,
  hnr TEXT,
  top TEXT,
  stock TEXT,
  m2 NUMERIC,
  zimmer NUMERIC,
  kaufpreis NUMERIC,
  beschreibung TEXT,
  ki_text TEXT,
  kurzinfo TEXT,
  provisionsstellung TEXT DEFAULT 'Käufer',
  kaeufer_provision NUMERIC,
  verkaeufer_provision NUMERIC,
  status TEXT DEFAULT 'aktiv',
  interne_notizen TEXT,
  immoz_exportiert BOOLEAN DEFAULT false,
  immoz_export_datum TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT DEFAULT 'offen',
  gesamtbetrag NUMERIC,
  internal_note TEXT,
  payment_method TEXT,
  kunde_id UUID REFERENCES public.customers(id),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers
CREATE POLICY "Users can view own customers" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customers" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own customers" ON public.customers FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all customers" ON public.customers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all customers" ON public.customers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for objects
CREATE POLICY "Users can view own objects" ON public.objects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own objects" ON public.objects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own objects" ON public.objects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own objects" ON public.objects FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all objects" ON public.objects FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all objects" ON public.objects FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for invoices
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all invoices" ON public.invoices FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON public.objects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
