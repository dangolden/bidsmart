/*
  # Add Data Sharing Consent Field

  1. Changes
    - Add `data_sharing_consent` boolean field to projects table
    - Add `data_sharing_consented_at` timestamp field to track when consent was given
    - Default to false (opt-in model, not opt-out)

  2. Purpose
    - Allow users to opt-in to sharing anonymized bid data to help other homeowners
    - Track consent timestamp for compliance and audit purposes
    - Support community benchmarking features
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'data_sharing_consent'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN data_sharing_consent boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'data_sharing_consented_at'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN data_sharing_consented_at timestamptz DEFAULT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.projects.data_sharing_consent IS 'User consent to share anonymized bid data to help other homeowners compare prices';
COMMENT ON COLUMN public.projects.data_sharing_consented_at IS 'Timestamp when user gave consent for data sharing';
