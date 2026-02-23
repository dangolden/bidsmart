-- ============================================================
-- BidSmart V2 — Chunk H: Seed Data
-- Seeds: incentive_program_database (3 core federal programs)
--        admin_users (initial admin)
-- ============================================================

-- ============================================================
-- SEED: incentive_program_database
-- Three core federal/national incentive programs.
-- ============================================================

INSERT INTO incentive_program_database (
  program_name,
  program_code,
  description,
  program_type,
  available_states,
  available_nationwide,
  rebate_percentage,
  max_rebate,
  requirements,
  income_qualified,
  stackable,
  is_active,
  last_verified,
  discovered_by
)
VALUES
  -- FED_25C: Federal Energy Efficient Home Improvement Tax Credit
  (
    'Federal Energy Efficient Home Improvement Tax Credit (25C)',
    'FED_25C',
    '30% federal tax credit for qualifying heat pump installations. Maximum $2,000 per year for heat pumps. Available through 2032.',
    'federal',
    NULL,
    true,
    30.00,
    2000.00,
    '{"energy_star_required": true, "min_seer2": 16, "min_hspf2": 8.5, "equipment_types": ["heat_pump", "air_source", "mini_split"]}',
    false,
    true,
    true,
    '2026-02-22',
    'seed'
  ),

  -- FED_HEEHR: High Efficiency Electric Home Rebate Act (IRA)
  (
    'High Efficiency Electric Home Rebate (HEEHR/IRA)',
    'FED_HEEHR',
    'Up to $8,000 rebate for qualifying heat pump installation via IRA-funded state programs. Income-qualified at 80-150% AMI. Available via participating state energy offices.',
    'federal',
    NULL,
    true,
    NULL,
    8000.00,
    '{"energy_star_required": true, "income_qualified": true, "income_threshold_pct_ami": 150}',
    true,
    true,
    true,
    '2026-02-22',
    'seed'
  ),

  -- ES_MOST_EFFICIENT: ENERGY STAR Most Efficient bonus
  (
    'ENERGY STAR Most Efficient Designation Bonus',
    'ES_MOST_EFFICIENT',
    'Additional rebate bonus for equipment carrying the ENERGY STAR Most Efficient designation. Available through various utility and state programs — amounts vary.',
    'federal',
    NULL,
    true,
    NULL,
    500.00,
    '{"energy_star_most_efficient": true}',
    false,
    true,
    true,
    '2026-02-22',
    'seed'
  )
ON CONFLICT (program_code) DO UPDATE SET
  program_name = EXCLUDED.program_name,
  description = EXCLUDED.description,
  max_rebate = EXCLUDED.max_rebate,
  requirements = EXCLUDED.requirements,
  last_verified = EXCLUDED.last_verified,
  updated_at = NOW();

-- ============================================================
-- SEED: admin_users (initial admin account)
-- Password: 'bidsmart2026' — change after first login.
-- ============================================================

INSERT INTO admin_users (email, password_hash, name, is_super_admin)
VALUES (
  'dan@theswitchison.org',
  extensions.crypt('bidsmart2026', extensions.gen_salt('bf')),
  'Dan Golden',
  true
)
ON CONFLICT (email) DO NOTHING;
