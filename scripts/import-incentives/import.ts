/**
 * Import incentive programs into incentive_program_database.
 *
 * Usage:
 *   npx tsx scripts/import-incentives/import.ts data.json
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

interface IncentiveInput {
  program_name: string;
  program_code: string;
  description?: string | null;
  program_type?: string | null;
  available_states?: string[] | null;
  available_zip_codes?: string[] | null;
  available_utilities?: string[] | null;
  available_nationwide?: boolean;
  rebate_amount?: number | null;
  rebate_percentage?: number | null;
  max_rebate?: number | null;
  requirements?: Record<string, any> | null;
  income_qualified?: boolean;
  income_limits?: Record<string, any> | null;
  valid_from?: string | null;
  valid_until?: string | null;
  application_url?: string | null;
  application_process?: string | null;
  typical_processing_days?: number | null;
  stackable?: boolean;
  cannot_stack_with?: string[] | null;
  is_active?: boolean;
  last_verified?: string | null;
  discovery_source_url?: string | null;
}

const REQUIRED_FIELDS = ['program_name', 'program_code'] as const;

function validate(record: any, index: number): string[] {
  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!record[field]) {
      errors.push(`Record ${index}: missing required field '${field}'`);
    }
  }
  if (record.program_type && !['federal', 'state', 'utility', 'manufacturer', 'tax_credit'].includes(record.program_type)) {
    errors.push(`Record ${index}: invalid program_type '${record.program_type}'`);
  }
  return errors;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/import-incentives/import.ts <data.json>');
    process.exit(1);
  }

  const absolutePath = resolve(filePath);
  console.log(`Reading: ${absolutePath}`);

  const raw = readFileSync(absolutePath, 'utf-8');
  const records: IncentiveInput[] = JSON.parse(raw);

  if (!Array.isArray(records)) {
    console.error('Expected a JSON array of incentive records');
    process.exit(1);
  }

  console.log(`Found ${records.length} records`);

  // Validate all records
  const allErrors: string[] = [];
  for (let i = 0; i < records.length; i++) {
    allErrors.push(...validate(records[i], i));
  }
  if (allErrors.length > 0) {
    console.error('Validation errors:');
    allErrors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  // Prepare records for upsert
  const today = new Date().toISOString().split('T')[0];
  const toUpsert = records.map(r => ({
    ...r,
    discovered_by: 'admin' as const,
    last_verified: r.last_verified || today,
    is_active: r.is_active ?? true,
    available_nationwide: r.available_nationwide ?? false,
    income_qualified: r.income_qualified ?? false,
    stackable: r.stackable ?? true,
  }));

  // Upsert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const batch = toUpsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('incentive_program_database')
      .upsert(batch, { onConflict: 'program_code', ignoreDuplicates: false })
      .select('id');

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length || 0;
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length || 0} upserted`);
    }
  }

  console.log(`\nDone. ${inserted} upserted, ${errors} errors.`);

  // Post-import validation
  console.log('\n--- Validation ---');
  const { count: totalCount } = await supabase
    .from('incentive_program_database')
    .select('*', { count: 'exact', head: true });
  console.log(`Total rows in table: ${totalCount}`);

  const { count: activeCount } = await supabase
    .from('incentive_program_database')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  console.log(`Active programs: ${activeCount}`);

  const { data: withZips } = await supabase
    .from('incentive_program_database')
    .select('id')
    .not('available_zip_codes', 'is', null);
  console.log(`Programs with zip coverage: ${withZips?.length || 0} / ${totalCount}`);

  const { data: nationwidePrograms } = await supabase
    .from('incentive_program_database')
    .select('program_code, program_name')
    .eq('available_nationwide', true);
  console.log(`Nationwide programs: ${nationwidePrograms?.length || 0}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
