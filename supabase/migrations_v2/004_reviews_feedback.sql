-- ============================================================
-- BidSmart V2 — Chunk D: Reviews + Feedback
-- Creates: contractor_installation_reviews, user_feedback
-- FK reference updated: contractor_bid_id -> bid_id -> bids(id)
-- ============================================================

-- ============================================================
-- TABLE 15 (User): contractor_installation_reviews
-- Post-installation homeowner reviews. Updated FK to reference bids.
-- Note: user_id is users_ext.id (NOT auth.uid() directly)
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_installation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,  -- renamed from contractor_bid_id
  user_id UUID NOT NULL REFERENCES users_ext(id) ON DELETE CASCADE,

  -- Overall ratings (1-5 scale)
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_of_work_rating INTEGER NOT NULL CHECK (quality_of_work_rating BETWEEN 1 AND 5),
  professionalism_rating INTEGER NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 5),
  communication_rating INTEGER NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  timeliness_rating INTEGER NOT NULL CHECK (timeliness_rating BETWEEN 1 AND 5),

  -- Checklist usage
  used_checklist BOOLEAN NOT NULL DEFAULT false,
  checklist_completeness_rating INTEGER
    CHECK (checklist_completeness_rating IS NULL OR (checklist_completeness_rating BETWEEN 1 AND 5)),

  -- Yes/No questions
  would_recommend BOOLEAN NOT NULL,
  completed_on_time BOOLEAN NOT NULL,
  stayed_within_budget BOOLEAN NOT NULL,
  critical_items_verified BOOLEAN NOT NULL,
  photo_documentation_provided BOOLEAN NOT NULL,

  -- Detailed feedback
  issues_encountered TEXT[] DEFAULT '{}',
  positive_comments TEXT,
  improvement_suggestions TEXT,

  -- One review per project
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_reviews_bid ON contractor_installation_reviews(bid_id);
CREATE INDEX IF NOT EXISTS idx_contractor_reviews_user ON contractor_installation_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_contractor_reviews_created ON contractor_installation_reviews(created_at DESC);

-- Trigger
CREATE TRIGGER trg_contractor_installation_reviews_updated_at
  BEFORE UPDATE ON contractor_installation_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE contractor_installation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews"
  ON contractor_installation_reviews FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users_ext WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own reviews"
  ON contractor_installation_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users_ext WHERE auth_user_id = auth.uid())
    AND
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users_ext u ON u.id = p.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own reviews"
  ON contractor_installation_reviews FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users_ext WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users_ext WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role full access to contractor_installation_reviews"
  ON contractor_installation_reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE 16 (User): user_feedback
-- Early access feedback (liked / wishlist / bug).
-- Public insert, authenticated read.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('liked', 'wishlist', 'bug')),
  message TEXT NOT NULL,
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_timestamp ON user_feedback(timestamp DESC);

-- RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public feedback submissions"
  ON user_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to user_feedback"
  ON user_feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
