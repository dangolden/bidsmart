/**
 * Import CA Electrification Programs into incentive_program_database.
 *
 * Reads: docs/CA Electrification Programs.json (107 programs)
 * Transforms: available_states, program_type_display
 * Upserts on: program_code (UNIQUE)
 *
 * Usage:
 *   npx tsx scripts/import-incentives/import-ca.ts
 *
 * Requires env vars: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- State name → 2-letter code mapping ---
const STATE_CODE_MAP: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY',
};

/**
 * Convert state names to 2-letter codes.
 * "California" → ["CA"], "ALL" → null (set available_nationwide instead)
 */
function transformStates(states: string[] | null): string[] | null {
  if (!states || states.length === 0) return null;
  if (states.includes('ALL')) return null; // will set available_nationwide = true
  return states.map(s => STATE_CODE_MAP[s] || s); // keep as-is if already a code
}

/**
 * Derive program_type_display from program_code prefix.
 */
function deriveTypeDisplay(programCode: string): string {
  const prefix = programCode.match(/^[A-Z]+/)?.[0] || '';
  switch (prefix) {
    case 'F':
    case 'FED':
      return 'federal';
    case 'S':
      return 'state';
    case 'U':
      return 'utility';
    case 'R':
      return 'regional';
    case 'C':
      return 'utility'; // CCA programs
    case 'AQ':
      return 'local'; // AQMD grants
    case 'M':
    case 'CITY':
      return 'local'; // Municipal / city programs
    case 'NGO':
      return 'local';
    case 'N':
    case 'O':
      return 'financing';
    case 'W':
      return 'utility'; // Water utility
    default:
      return 'state'; // safe fallback for CA
  }
}

async function main() {
  const filePath = resolve(__dirname, '../../docs/CA Electrification Programs.json');
  console.log(`Reading: ${filePath}`);

  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  if (!data.programs || !Array.isArray(data.programs)) {
    console.error('Expected { _meta, programs: [...] } structure');
    process.exit(1);
  }

  const programs = data.programs;
  console.log(`Found ${programs.length} programs`);
  console.log(`Meta: ${data._meta?.title} — ${data._meta?.total_programs} programs, verified ${data._meta?.source_verified}`);

  // Transform and prepare records
  const toUpsert = programs.map((p: any) => {
    const isNationwide = p.available_states?.includes('ALL') || p.available_nationwide === true;
    const transformedStates = transformStates(p.available_states);

    return {
      program_name: p.program_name,
      program_code: p.program_code,
      description: p.description || null,
      program_type: p.program_type || null, // keep original detailed type
      program_type_display: deriveTypeDisplay(p.program_code),
      available_states: transformedStates,
      available_zip_codes: (p.available_zip_codes && p.available_zip_codes.length > 0) ? p.available_zip_codes : null,
      available_utilities: (p.available_utilities && p.available_utilities.length > 0) ? p.available_utilities : null,
      available_nationwide: isNationwide,
      rebate_amount: p.rebate_amount ?? null,
      rebate_percentage: p.rebate_percentage ?? null,
      max_rebate: p.max_rebate ?? null,
      requirements: p.requirements || null,
      income_qualified: p.income_qualified ?? false,
      income_limits: p.income_limits || null,
      valid_from: p.valid_from || null,
      valid_until: p.valid_until || null,
      application_url: p.application_url || null,
      application_process: p.application_process || null,
      typical_processing_days: p.typical_processing_days ?? null,
      stackable: p.stackable ?? true,
      cannot_stack_with: (p.cannot_stack_with && p.cannot_stack_with.length > 0) ? p.cannot_stack_with : null,
      is_active: p.is_active ?? true,
      last_verified: p.last_verified || new Date().toISOString().split('T')[0],
      discovered_by: 'admin' as const,
      discovery_source_url: p.discovery_source_url || null,
    };
  });

  // Validate required fields
  const errors: string[] = [];
  toUpsert.forEach((r: any, i: number) => {
    if (!r.program_name) errors.push(`Record ${i}: missing program_name`);
    if (!r.program_code) errors.push(`Record ${i}: missing program_code`);
  });
  if (errors.length > 0) {
    console.error('Validation errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  // Show summary before upsert
  const typeCounts: Record<string, number> = {};
  toUpsert.forEach((r: any) => {
    const t = r.program_type_display || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  console.log('\nType distribution:');
  Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  const activeCount = toUpsert.filter((r: any) => r.is_active).length;
  const inactiveCount = toUpsert.filter((r: any) => !r.is_active).length;
  console.log(`\nActive: ${activeCount}, Inactive: ${inactiveCount}`);

  const withZips = toUpsert.filter((r: any) => r.available_zip_codes && r.available_zip_codes.length > 0).length;
  console.log(`Programs with zip codes: ${withZips}`);

  // Upsert in batches of 20 (smaller batches for large zip arrays)
  const BATCH_SIZE = 20;
  let totalUpserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const batch = toUpsert.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase
      .from('incentive_program_database')
      .upsert(batch, { onConflict: 'program_code', ignoreDuplicates: false })
      .select('id, program_code');

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      // Try records individually to identify the problematic one
      for (const record of batch) {
        const { error: singleError } = await supabase
          .from('incentive_program_database')
          .upsert(record, { onConflict: 'program_code', ignoreDuplicates: false })
          .select('id');
        if (singleError) {
          console.error(`  Failed: ${record.program_code} — ${singleError.message}`);
          totalErrors++;
        } else {
          totalUpserted++;
        }
      }
    } else {
      totalUpserted += result?.length || 0;
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result?.length || 0} upserted`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Upserted: ${totalUpserted}`);
  console.log(`Errors: ${totalErrors}`);

  // Post-import validation
  console.log('\n--- Validation ---');
  const { count: totalCount } = await supabase
    .from('incentive_program_database')
    .select('*', { count: 'exact', head: true });
  console.log(`Total rows in table: ${totalCount}`);

  const { count: activeTotal } = await supabase
    .from('incentive_program_database')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  console.log(`Active programs: ${activeTotal}`);

  // Sample zip lookup: 90210 (Beverly Hills, LA County)
  const { data: la_results } = await supabase
    .from('incentive_program_database')
    .select('program_code, program_name, program_type_display, max_rebate')
    .eq('is_active', true)
    .or('available_nationwide.eq.true,available_zip_codes.cs.{"90210"},available_states.cs.{"CA"}')
    .order('max_rebate', { ascending: false, nullsFirst: false });
  console.log(`\nZip 90210 (Beverly Hills) — ${la_results?.length || 0} programs:`);
  la_results?.slice(0, 5).forEach(r => {
    console.log(`  ${r.program_code} [${r.program_type_display}] ${r.program_name} — max ${r.max_rebate ? '$' + r.max_rebate : 'N/A'}`);
  });
  if ((la_results?.length || 0) > 5) console.log(`  ... and ${(la_results?.length || 0) - 5} more`);

  // Sample zip lookup: 94102 (San Francisco)
  const { data: sf_results } = await supabase
    .from('incentive_program_database')
    .select('program_code, program_name, program_type_display, max_rebate')
    .eq('is_active', true)
    .or('available_nationwide.eq.true,available_zip_codes.cs.{"94102"},available_states.cs.{"CA"}')
    .order('max_rebate', { ascending: false, nullsFirst: false });
  console.log(`\nZip 94102 (San Francisco) — ${sf_results?.length || 0} programs:`);
  sf_results?.slice(0, 5).forEach(r => {
    console.log(`  ${r.program_code} [${r.program_type_display}] ${r.program_name} — max ${r.max_rebate ? '$' + r.max_rebate : 'N/A'}`);
  });
  if ((sf_results?.length || 0) > 5) console.log(`  ... and ${(sf_results?.length || 0) - 5} more`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
