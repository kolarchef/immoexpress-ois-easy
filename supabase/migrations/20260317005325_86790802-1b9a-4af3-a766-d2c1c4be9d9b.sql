ALTER TABLE public.objekte ADD COLUMN IF NOT EXISTS zielgruppe text DEFAULT NULL;
ALTER TABLE public.objekte ADD COLUMN IF NOT EXISTS verkaufs_fokus text DEFAULT NULL;