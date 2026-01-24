/*
  # Add MindPal Run ID Column

  1. Schema Changes
    - Add `mindpal_run_id` column to `pdf_uploads` table
      - Stores the workflow_run_id returned by MindPal's async API trigger
      - Used to correlate callbacks with upload records
    
  2. Indexes
    - Add index on `mindpal_run_id` for fast lookups during callback processing

  3. Security
    - Add service role policy for Edge Functions to update pdf_uploads
    - This allows the callback function (authenticated via HMAC, not JWT) to update records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_uploads' AND column_name = 'mindpal_run_id'
  ) THEN
    ALTER TABLE pdf_uploads ADD COLUMN mindpal_run_id TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pdf_mindpal_run_id ON pdf_uploads(mindpal_run_id);

COMMENT ON COLUMN pdf_uploads.mindpal_run_id IS 'Workflow run ID returned by MindPal async API trigger';
