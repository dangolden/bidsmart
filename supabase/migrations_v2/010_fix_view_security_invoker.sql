-- ============================================================
-- BidSmart V2 — Migration 010: Fix View Security Mode
-- Changes all 7 views from SECURITY DEFINER → SECURITY INVOKER
-- SECURITY DEFINER bypasses RLS (runs as DB owner).
-- SECURITY INVOKER enforces RLS per the querying user's identity.
-- Supabase defaults to SECURITY DEFINER when not specified — this
-- migration explicitly sets security_invoker = true on all views.
-- No changes to SELECT logic — only the view header is updated.
-- ============================================================

-- ============================================================
-- VIEW 1: v_bid_summary
-- BidCard and list views — name, price, score, ratings, flags.
-- Joins: bids + bid_contractors + bid_scores
-- ============================================================

CREATE OR REPLACE VIEW v_bid_summary
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.project_id,
  b.contractor_name,
  b.system_type,
  b.total_bid_amount,
  b.estimated_rebates,
  b.total_after_rebates,
  b.labor_warranty_years,
  b.equipment_warranty_years,
  b.estimated_days,
  b.is_favorite,
  b.created_at,

  -- Contractor ratings (from bid_contractors)
  bc.company AS contractor_company,
  bc.google_rating,
  bc.google_review_count,
  bc.bbb_rating,
  bc.bbb_accredited,
  bc.years_in_business,
  bc.certifications,
  bc.license_status,
  bc.insurance_verified,

  -- Scores (from bid_scores)
  bs.overall_score,
  bs.value_score,
  bs.quality_score,
  bs.completeness_score,
  bs.ranking_recommendation,
  bs.red_flags,
  bs.positive_indicators
FROM bids b
LEFT JOIN bid_contractors bc ON bc.bid_id = b.id
LEFT JOIN bid_scores bs ON bs.bid_id = b.id;

-- ============================================================
-- VIEW 2: v_bid_compare_equipment
-- Equipment tab — function-based comparison aligned by system_role.
-- Joins: bids (name, system_type) + bid_equipment
-- ============================================================

CREATE OR REPLACE VIEW v_bid_compare_equipment
WITH (security_invoker = true) AS
SELECT
  b.project_id,
  b.id AS bid_id,
  b.contractor_name,
  b.system_type,

  -- Equipment fields
  e.id AS equipment_id,
  e.equipment_type,
  e.system_role,
  e.brand,
  e.model_number,
  e.model_name,
  e.capacity_btu,
  e.capacity_tons,
  e.seer_rating,
  e.seer2_rating,
  e.hspf_rating,
  e.hspf2_rating,
  e.eer_rating,
  e.cop,
  e.afue_rating,
  e.fuel_type,
  e.variable_speed,
  e.stages,
  e.refrigerant_type,
  e.sound_level_db,
  e.voltage,
  e.amperage_draw,
  e.minimum_circuit_amperage,
  e.energy_star_certified,
  e.energy_star_most_efficient,
  e.warranty_years,
  e.compressor_warranty_years,
  e.equipment_cost,
  e.confidence
FROM bids b
JOIN bid_equipment e ON e.bid_id = b.id;

-- ============================================================
-- VIEW 3: v_bid_compare_contractors
-- Contractors tab comparison grid.
-- Joins: bids + bid_contractors + bid_scores (flags)
-- ============================================================

CREATE OR REPLACE VIEW v_bid_compare_contractors
WITH (security_invoker = true) AS
SELECT
  b.project_id,
  b.id AS bid_id,
  b.contractor_name,

  -- All contractor fields
  bc.id AS bid_contractor_id,
  bc.name,
  bc.company,
  bc.contact_name,
  bc.phone,
  bc.email,
  bc.website,
  bc.license,
  bc.license_state,
  bc.license_status,
  bc.license_expiration_date,
  bc.insurance_verified,
  bc.bonded,
  bc.years_in_business,
  bc.year_established,
  bc.total_installs,
  bc.certifications,
  bc.employee_count,
  bc.service_area,
  bc.google_rating,
  bc.google_review_count,
  bc.yelp_rating,
  bc.yelp_review_count,
  bc.bbb_rating,
  bc.bbb_accredited,
  bc.bbb_complaints_3yr,
  bc.research_confidence,
  bc.verification_date,
  bc.research_notes,

  -- Score flags
  bs.red_flags,
  bs.positive_indicators,
  bs.overall_score
FROM bids b
LEFT JOIN bid_contractors bc ON bc.bid_id = b.id
LEFT JOIN bid_scores bs ON bs.bid_id = b.id;

-- ============================================================
-- VIEW 4: v_bid_compare_scope
-- Scope tab — scope booleans, electrical work, accessories, line items.
-- Joins: bids + bid_scope
-- ============================================================

CREATE OR REPLACE VIEW v_bid_compare_scope
WITH (security_invoker = true) AS
SELECT
  b.project_id,
  b.id AS bid_id,
  b.contractor_name,

  -- All scope fields
  s.id AS scope_id,
  s.summary,
  s.inclusions,
  s.exclusions,
  s.permit_included, s.permit_detail,
  s.disposal_included, s.disposal_detail,
  s.electrical_included, s.electrical_detail,
  s.ductwork_included, s.ductwork_detail,
  s.thermostat_included, s.thermostat_detail,
  s.manual_j_included, s.manual_j_detail,
  s.commissioning_included, s.commissioning_detail,
  s.air_handler_included, s.air_handler_detail,
  s.line_set_included, s.line_set_detail,
  s.disconnect_included, s.disconnect_detail,
  s.pad_included, s.pad_detail,
  s.drain_line_included, s.drain_line_detail,

  -- Electrical work sub-group
  s.panel_assessment_included,
  s.panel_upgrade_included,
  s.dedicated_circuit_included,
  s.electrical_permit_included,
  s.load_calculation_included,
  s.existing_panel_amps,
  s.proposed_panel_amps,
  s.breaker_size_required,
  s.panel_upgrade_cost,
  s.electrical_notes,

  -- Accessories + Line Items
  s.accessories,
  s.line_items
FROM bids b
JOIN bid_scope s ON s.bid_id = b.id;

-- ============================================================
-- VIEW 5: v_bid_full
-- Full bid record — all 4 bid tables joined.
-- For edge cases requiring the complete picture.
-- ============================================================

CREATE OR REPLACE VIEW v_bid_full
WITH (security_invoker = true) AS
SELECT
  b.*,
  bc.name AS bc_name,
  bc.company AS bc_company,
  bc.phone AS bc_phone,
  bc.email AS bc_email,
  bc.website AS bc_website,
  bc.license AS bc_license,
  bc.license_state AS bc_license_state,
  bc.license_status AS bc_license_status,
  bc.google_rating AS bc_google_rating,
  bc.google_review_count AS bc_google_review_count,
  bc.bbb_rating AS bc_bbb_rating,
  bc.bbb_accredited AS bc_bbb_accredited,
  bc.certifications AS bc_certifications,
  bc.years_in_business AS bc_years_in_business,
  bc.research_confidence AS bc_research_confidence,

  s.summary AS scope_summary,
  s.permit_included, s.disposal_included, s.electrical_included,
  s.ductwork_included, s.thermostat_included, s.manual_j_included,
  s.panel_upgrade_included, s.existing_panel_amps, s.proposed_panel_amps,
  s.electrical_notes, s.accessories, s.line_items,

  bs.overall_score, bs.value_score, bs.quality_score, bs.completeness_score,
  bs.ranking_recommendation, bs.red_flags, bs.positive_indicators
FROM bids b
LEFT JOIN bid_contractors bc ON bc.bid_id = b.id
LEFT JOIN bid_scope s ON s.bid_id = b.id
LEFT JOIN bid_scores bs ON bs.bid_id = b.id;

-- ============================================================
-- VIEW 6: v_community_pricing
-- Admin dashboard — regional pricing benchmarks (anonymized).
-- Joins: community_bids + community_contractors
-- ============================================================

CREATE OR REPLACE VIEW v_community_pricing
WITH (security_invoker = true) AS
SELECT
  cb.state,
  cb.zip_code_area,
  cb.equipment_type,
  cb.bid_date,
  cb.total_bid_amount,
  cb.labor_cost,
  cb.equipment_cost,
  cb.primary_seer_rating,
  cb.primary_capacity_tons,
  cb.includes_permit,
  cb.includes_electrical,
  cb.includes_ductwork,
  cb.labor_warranty_years,
  cb.estimated_days,

  -- Contractor context (anonymized)
  cc.years_in_business,
  cc.certifications,
  cc.google_rating
FROM community_bids cb
LEFT JOIN community_contractors cc ON cc.id = cb.community_contractor_id;

-- ============================================================
-- VIEW 7: admin_stats
-- Aggregated platform metrics for admin dashboard.
-- ============================================================

CREATE OR REPLACE VIEW admin_stats
WITH (security_invoker = true) AS
SELECT
  -- Project counts
  (SELECT COUNT(*) FROM projects) AS total_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'draft') AS draft_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'analyzing') AS analyzing_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'comparing') AS comparing_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'completed') AS completed_projects,
  (SELECT COUNT(*) FROM projects WHERE status NOT IN ('draft', 'cancelled')) AS total_runs,

  -- Bid counts
  (SELECT COUNT(*) FROM bids) AS total_bids,
  (SELECT COUNT(DISTINCT contractor_name) FROM bids) AS unique_contractors,

  -- PDF counts
  (SELECT COUNT(*) FROM pdf_uploads) AS total_pdfs,
  (SELECT COUNT(*) FROM pdf_uploads WHERE status = 'extracted') AS processed_pdfs,

  -- User counts
  (SELECT COUNT(*) FROM users_ext) AS total_users,

  -- Community data
  (SELECT COUNT(*) FROM community_bids) AS community_bid_count,
  (SELECT COUNT(*) FROM community_contractors) AS community_contractor_count,

  -- Timestamp
  NOW() AS generated_at;

-- ============================================================
-- Re-apply grants (unchanged from migration 007)
-- ============================================================

GRANT SELECT ON v_bid_summary TO authenticated;
GRANT SELECT ON v_bid_compare_equipment TO authenticated;
GRANT SELECT ON v_bid_compare_contractors TO authenticated;
GRANT SELECT ON v_bid_compare_scope TO authenticated;
GRANT SELECT ON v_bid_full TO authenticated;
GRANT SELECT ON v_community_pricing TO authenticated, anon;
