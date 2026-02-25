-- Post-import validation queries for incentive_program_database
-- Run these after importing data to verify correctness.

-- 1. Total rows
SELECT COUNT(*) AS total_programs FROM incentive_program_database;

-- 2. Active vs inactive
SELECT is_active, COUNT(*) AS count
FROM incentive_program_database
GROUP BY is_active;

-- 3. Programs by type
SELECT program_type, COUNT(*) AS count
FROM incentive_program_database
GROUP BY program_type
ORDER BY count DESC;

-- 4. Duplicate program_code check (should return 0 rows)
SELECT program_code, COUNT(*)
FROM incentive_program_database
GROUP BY program_code
HAVING COUNT(*) > 1;

-- 5. Zip coverage stats
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE available_zip_codes IS NOT NULL AND array_length(available_zip_codes, 1) > 0) AS with_zips,
  COUNT(*) FILTER (WHERE available_nationwide = true) AS nationwide,
  COUNT(*) FILTER (WHERE available_states IS NOT NULL AND array_length(available_states, 1) > 0) AS with_states
FROM incentive_program_database
WHERE is_active = true;

-- 6. Sample zip lookup: 90210 (Los Angeles, CA)
SELECT program_name, program_type, max_rebate
FROM incentive_program_database
WHERE is_active = true
  AND (
    available_nationwide = true
    OR available_zip_codes @> ARRAY['90210']
    OR available_states @> ARRAY['CA']
  )
ORDER BY program_type, max_rebate DESC NULLS LAST;

-- 7. Sample zip lookup: 10001 (New York, NY)
SELECT program_name, program_type, max_rebate
FROM incentive_program_database
WHERE is_active = true
  AND (
    available_nationwide = true
    OR available_zip_codes @> ARRAY['10001']
    OR available_states @> ARRAY['NY']
  )
ORDER BY program_type, max_rebate DESC NULLS LAST;

-- 8. Sample zip lookup: 02101 (Boston, MA)
SELECT program_name, program_type, max_rebate
FROM incentive_program_database
WHERE is_active = true
  AND (
    available_nationwide = true
    OR available_zip_codes @> ARRAY['02101']
    OR available_states @> ARRAY['MA']
  )
ORDER BY program_type, max_rebate DESC NULLS LAST;

-- 9. Programs missing last_verified (stale data risk)
SELECT program_code, program_name
FROM incentive_program_database
WHERE last_verified IS NULL OR last_verified < CURRENT_DATE - INTERVAL '90 days';

-- 10. Discovery source breakdown
SELECT discovered_by, COUNT(*)
FROM incentive_program_database
GROUP BY discovered_by;
