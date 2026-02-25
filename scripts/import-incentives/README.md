# Incentive Program Import Script

Imports incentive programs into the `incentive_program_database` table via upsert on `program_code`.

## Prerequisites

- Node.js 18+
- `@supabase/supabase-js` (already in project dependencies)
- `tsx` for running TypeScript (`npx tsx`)

## Environment Variables

```bash
export SUPABASE_URL="https://zsfsuzlwsvgfklbtpwmu.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Or use `VITE_SUPABASE_URL` (the script checks both).

## Input Format

JSON array of objects. See `sample-data.json` for full examples.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `program_name` | string | Official program name |
| `program_code` | string | Unique code (upsert key) — e.g., `FED_25C`, `CA_SGIP` |

### Optional Fields

All other `incentive_program_database` columns are optional. Key ones:

- `program_type`: `federal`, `state`, `utility`, `manufacturer`
- `available_states`: array of 2-letter state codes
- `available_zip_codes`: array of 5-digit zip strings
- `available_nationwide`: boolean (default false)
- `rebate_amount`, `rebate_percentage`, `max_rebate`: dollar amounts
- `requirements`: JSONB with keys like `min_seer2`, `energy_star_required`, `equipment_types`
- `income_qualified`, `income_limits`: for income-based programs
- `valid_from`, `valid_until`: date strings (YYYY-MM-DD)
- `application_url`, `application_process`: how to apply
- `stackable`, `cannot_stack_with`: stacking rules
- `discovery_source_url`: where this data was found

## Usage

```bash
# Import from JSON file
npx tsx scripts/import-incentives/import.ts path/to/incentives.json

# Import sample data (for testing)
npx tsx scripts/import-incentives/import.ts scripts/import-incentives/sample-data.json
```

The script will:
1. Validate all records for required fields
2. Set `discovered_by = 'admin'` and `last_verified = today` for all records
3. Upsert on `program_code` (updates existing, inserts new)
4. Print summary and validation stats

## Post-Import Validation

Run the queries in `validate.sql` to verify:
- Total row count
- Programs by type
- Duplicate check
- Zip coverage stats
- Sample lookups for known zips
