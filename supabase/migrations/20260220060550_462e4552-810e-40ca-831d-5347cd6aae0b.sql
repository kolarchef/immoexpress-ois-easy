
-- ============================================================
-- IMMOEXPRESS – Datenbankschema (AT)
-- ============================================================

-- 1. OBJEKTE (Immobilien-Daten inkl. ImmoZ-Mapping)
CREATE TABLE public.objekte (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objektnummer      TEXT,
  kurzinfo          TEXT,
  objektart         TEXT,
  flaeche_m2        NUMERIC,
  kaufpreis         NUMERIC,
  zimmer            NUMERIC,
  plz               TEXT,
  ort               TEXT,
  strasse           TEXT,
  hnr               TEXT,
  provisionsstellung TEXT DEFAULT 'Käufer',
  beschreibung      TEXT,
  ki_text           TEXT,
  verkaufsart       TEXT DEFAULT 'Kauf',
  status            TEXT DEFAULT 'aktiv',
  immoz_exportiert  BOOLEAN DEFAULT FALSE,
  immoz_export_datum TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.objekte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon (demo)" ON public.objekte
  FOR ALL USING (true) WITH CHECK (true);

-- 2. CRM KUNDEN
CREATE TABLE public.crm_kunden (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  typ           TEXT DEFAULT 'Käufer',
  ort           TEXT,
  budget        TEXT,
  status        TEXT DEFAULT 'Aktiv',
  sterne        INTEGER DEFAULT 3,
  notiz         TEXT,
  geburtsdatum  DATE,
  kaufdatum     DATE,
  einzugsdatum  DATE,
  dsgvo_einwilligung BOOLEAN DEFAULT FALSE,
  newsletter_aktiv   BOOLEAN DEFAULT TRUE,
  liste         TEXT DEFAULT 'Käufer Wien',
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_kunden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon (demo)" ON public.crm_kunden
  FOR ALL USING (true) WITH CHECK (true);

-- 3. NEWSLETTER KAMPAGNEN
CREATE TABLE public.newsletter_kampagnen (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  betreff     TEXT NOT NULL,
  text        TEXT,
  liste       TEXT DEFAULT 'alle',
  typ         TEXT DEFAULT 'manuell',
  empfaenger  INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'gesendet',
  gesendet_am TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_kampagnen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon (demo)" ON public.newsletter_kampagnen
  FOR ALL USING (true) WITH CHECK (true);

-- 4. IMMOZ EXPORTE (Log)
CREATE TABLE public.immoz_exporte (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objekte_ids UUID[],
  anzahl      INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'Erfolgreich',
  dateiname   TEXT,
  erstellt_am TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.immoz_exporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon (demo)" ON public.immoz_exporte
  FOR ALL USING (true) WITH CHECK (true);

-- 5. AUTO-TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_objekte_updated_at
  BEFORE UPDATE ON public.objekte
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_kunden_updated_at
  BEFORE UPDATE ON public.crm_kunden
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. DEMO-DATEN: CRM-Kunden einfügen
INSERT INTO public.crm_kunden (name, email, phone, typ, ort, budget, status, sterne, notiz, geburtsdatum, kaufdatum, einzugsdatum, liste)
VALUES
  ('Maria Huber',   'm.huber@email.at',     '+43 664 123 4567', 'Käufer',   'Wien 1010',  '€650.000', 'Aktiv',         5, 'Sucht 4-Zimmer-Wohnung, Alleinvermittlung bevorzugt', '1982-03-15', '2024-06-01', '2024-07-15', 'Käufer Wien'),
  ('Thomas Müller', 't.mueller@firma.at',   '+43 676 987 6543', 'Verkäufer','Wien 1030',  '€420.000', 'Aktiv',         4, 'Verkauf Eigentumswohnung, flexibel bei Übergabe',       '1975-11-28', '2023-09-10', '2023-11-01', 'Investoren Österreich'),
  ('Anna Schmidt',  'a.schmidt@web.at',     '+43 699 555 1234', 'Mieter',   'Graz',       '€1.800/Mon','In Bearbeitung',3, 'Sucht Bürofläche 120m²',                               '1990-07-04', '2025-01-15', '2025-02-01', 'Mieter Graz'),
  ('Karl Bauer',    'k.bauer@outlook.at',   '+43 660 321 7890', 'Investor', 'Salzburg',   '€1.2M',    'Aktiv',         5, 'Anlageimmobilien, Rendite min. 4%',                     '1968-12-25', '2022-04-20', '2022-06-01', 'Investoren Österreich'),
  ('Sandra Lehner', 's.lehner@gmx.at',      '+43 650 444 8888', 'Käufer',   'Linz',       '€280.000', 'Neu',           4, 'Erstmals Kaufinteressentin',                             '1995-05-20', NULL,          NULL,          'Käufer Linz'),
  ('Peter Wimmer',  'p.wimmer@aon.at',      '+43 664 777 2222', 'Verkäufer','Wien 1180',  '€890.000', 'Aktiv',         5, 'Einfamilienhaus, Alleinvermittlungsvertrag',             '1970-08-10', '2021-12-01', '2022-02-15', 'Verkäufer Wien');
