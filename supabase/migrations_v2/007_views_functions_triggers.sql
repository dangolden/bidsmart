-- ============================================================
-- BidSmart V2 — Chunk G: Views, Functions, Triggers
-- Creates 6 SQL views + community data trigger on bids
-- Views: v_bid_summary, v_bid_compare_equipment,
--        v_bid_compare_contractors, v_bid_compare_scope,
--        v_bid_full, v_community_pricing
-- ============================================================

-- ============================================================
-- TRIGGER: Populate community data when bid status -> 'completed'
-- Only fires on UPDATE when status transitions to 'completed'.
-- At that point bid_scope is guaranteed to exist.
-- ============================================================

CREATE OR REPLACE TRIGGER trg_bids_community_data
  AFTER UPDATE ON bids
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION populate_community_data();

-- ============================================================
-- VIEW 1: v_bid_summary
-- BidCard and list views — name, price, score, ratings, flags.
-- Joins: bids + bid_scope (pricing) + bid_contractors + bid_scores
-- ============================================================

CREATE OR REPLACE VIEW v_bid_summary AS
SELECT
  b.id,
  b.project_id,
  b.contractor_name,
  b.status,
  b.is_favorite,
  b.created_at,

  -- Pricing & details (from bid_scope)
  sc.system_type,
  sc.total_bid_amount,
  sc.estimated_rebates,
  sc.total_after_rebates,
  sc.labor_warranty_years,
  sc.equipment_warranty_years,
  sc.estimated_days,

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
LEFT JOIN bid_scope sc ON sc.bid_id = b.id
LEFT JOIN bid_contractors bc ON bc.bid_id = b.id
LEFT JOIN bid_scores bs ON bs.bid_id = b.id;

-- ============================================================
-- VIEW 2: v_bid_compare_equipment
-- Equipment tab — function-based comparison aligned by system_role.
-- Joins: bids + bid_scope (system_type) + bid_equipment
-- ============================================================

CREATE OR REPLACE VIEW v_bid_compare_equipment AS
SELECT
  b.project_id,
  b.id AS bid_id,
  b.contractor_name,
  sc.system_type,

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
LEFT JOIN bid_scope sc ON sc.bid_id = b.id
JOIN bid_equipment e ON e.bid_id = b.id;

-- ============================================================
-- VIEW 3: v_bid_compare_contractors
-- Contractors tab comparison grid.
-- Joins: bids + bid_contractors + bid_scores (flags)
-- No change needed — only uses b.project_id, b.id, b.contractor_name
-- ============================================================

CREATE OR REPLACE VIEW v_bid_compare_contractors AS
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
-- Scope tab — pricing, scope booleans, electrical work, accessories, line items.
-- Joins: bids + bid_scope (now includes pricing columns too)
-- ============================================================

CREATE OR REPLACE VIEW v_bid_compare_scope AS
SELECT
  b.project_id,
  b.id AS bid_id,
  b.contractor_name,

  -- Scope identity
  s.id AS scope_id,

  -- Pricing (now on bid_scope)
  s.system_type,
  s.total_bid_amount,
  s.labor_cost,
  s.equipment_cost,
  s.materials_cost,
  s.permit_cost,
  s.disposal_cost,
  s.electrical_cost,
  s.total_before_rebates,
  s.estimated_rebates,
  s.total_after_rebates,

  -- Payment terms
  s.deposit_required,
  s.deposit_percentage,
  s.payment_schedule,
  s.financing_offered,
  s.financing_terms,

  -- Warranty
  s.labor_warranty_years,
  s.equipment_warranty_years,
  s.compressor_warranty_years,
  s.additional_warranty_details,

  -- Timeline
  s.estimated_days,
  s.start_date_available,
  s.bid_date,
  s.valid_until,

  -- Summary & free-form
  s.summary,
  s.inclusions,
  s.exclusions,

  -- Scope booleans + details
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

  -- Extraction metadata
  s.extraction_confidence,
  s.extraction_notes,

  -- Accessories + Line Items
  s.accessories,
  s.line_items
FROM bids b
JOIN bid_scope s ON s.bid_id = b.id;

-- ============================================================
-- VIEW 5: v_bid_full
-- Full bid record — all 4 bid tables joined.
-- Explicit column list (no b.*) for stability after schema changes.
-- ============================================================

CREATE OR REPLACE VIEW v_bid_full AS
SELECT
  -- Bids identity/status
  b.id,
  b.project_id,
  b.pdf_upload_id,
  b.bid_index,
  b.status,
  b.request_id,
  b.storage_key,
  b.source_doc_url,
  b.source_doc_mime,
  b.processing_attempts,
  b.last_error,
  b.contractor_name,
  b.verified_by_user,
  b.verified_at,
  b.user_notes,
  b.is_favorite,
  b.created_at,
  b.updated_at,

  -- Pricing & scope from bid_scope
  sc.system_type,
  sc.total_bid_amount,
  sc.labor_cost,
  sc.equipment_cost,
  sc.materials_cost,
  sc.permit_cost,
  sc.disposal_cost,
  sc.electrical_cost,
  sc.total_before_rebates,
  sc.estimated_rebates,
  sc.total_after_rebates,
  sc.deposit_required,
  sc.deposit_percentage,
  sc.payment_schedule,
  sc.financing_offered,
  sc.financing_terms,
  sc.labor_warranty_years,
  sc.equipment_warranty_years,
  sc.compressor_warranty_years,
  sc.additional_warranty_details,
  sc.estimated_days,
  sc.start_date_available,
  sc.bid_date,
  sc.valid_until,
  sc.extraction_confidence,
  sc.extraction_notes,
  sc.summary AS scope_summary,
  sc.permit_included, sc.disposal_included, sc.electrical_included,
  sc.ductwork_included, sc.thermostat_included, sc.manual_j_included,
  sc.panel_upgrade_included, sc.existing_panel_amps, sc.proposed_panel_amps,
  sc.electrical_notes, sc.accessories, sc.line_items,

  -- Contractor fields
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

  -- Score fields
  bs.overall_score, bs.value_score, bs.quality_score, bs.completeness_score,
  bs.ranking_recommendation, bs.red_flags, bs.positive_indicators
FROM bids b
LEFT JOIN bid_scope sc ON sc.bid_id = b.id
LEFT JOIN bid_contractors bc ON bc.bid_id = b.id
LEFT JOIN bid_scores bs ON bs.bid_id = b.id;

-- ============================================================
-- VIEW 6: v_community_pricing
-- Admin dashboard — regional pricing benchmarks.
-- Joins: community_bids + community_contractors
-- No change needed — community tables unchanged.
-- ============================================================

CREATE OR REPLACE VIEW v_community_pricing AS
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

-- Grant view access to authenticated users
GRANT SELECT ON v_bid_summary TO authenticated;
GRANT SELECT ON v_bid_compare_equipment TO authenticated;
GRANT SELECT ON v_bid_compare_contractors TO authenticated;
GRANT SELECT ON v_bid_compare_scope TO authenticated;
GRANT SELECT ON v_bid_full TO authenticated;
GRANT SELECT ON v_community_pricing TO authenticated, anon;

-- ============================================================
-- ADMIN STATS VIEW
-- Aggregated platform metrics for admin dashboard.
-- ============================================================

CREATE OR REPLACE VIEW admin_stats AS
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
