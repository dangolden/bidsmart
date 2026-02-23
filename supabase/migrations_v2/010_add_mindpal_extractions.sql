-- ============================================================
-- Migration 010: Add mindpal_extractions table (debug/audit)
-- ============================================================
-- This table was originally dropped from V2 ("debug artifact"),
-- but the mindpal-callback edge function writes to it for
-- audit/debugging of raw MindPal extraction data.
-- Adding it back to prevent silent insert failures.
-- ============================================================

CREATE TABLE IF NOT EXISTS mindpal_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_upload_id UUID NOT NULL REFERENCES pdf_uploads(id) ON DELETE CASCADE,

  -- Raw extraction
  raw_json JSONB NOT NULL,

  -- Parsing results
  parsed_successfully BOOLEAN DEFAULT false,
  parsing_errors TEXT[],

  -- Mapping to V2 bids table
  mapped_bid_id UUID REFERENCES bids(id) ON DELETE SET NULL,

  -- Confidence scores from MindPal
  overall_confidence DECIMAL(5,2),
  field_confidences JSONB,

  -- Timestamps
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for lookup by pdf_upload_id
CREATE INDEX IF NOT EXISTS idx_mindpal_extractions_pdf_upload_id
  ON mindpal_extractions(pdf_upload_id);

-- Index for lookup by mapped bid
CREATE INDEX IF NOT EXISTS idx_mindpal_extractions_mapped_bid_id
  ON mindpal_extractions(mapped_bid_id);

-- RLS: Service role only (edge functions write, admin reads)
ALTER TABLE mindpal_extractions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions run as service role)
-- No user-facing RLS policies needed — this is an internal debug table
