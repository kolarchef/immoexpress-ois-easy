
-- Add result fields to meetings
ALTER TABLE public.meetings ADD COLUMN ergebnisse_text text;
ALTER TABLE public.meetings ADD COLUMN ergebnisse_verfuegbar boolean NOT NULL DEFAULT false;

-- Add typ column to meeting_files to distinguish 'dokument' vs 'ergebnis'
ALTER TABLE public.meeting_files ADD COLUMN typ text NOT NULL DEFAULT 'dokument';
