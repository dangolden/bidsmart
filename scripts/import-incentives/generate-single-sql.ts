/**
 * Generate a SINGLE SQL file with individual INSERT statements (one per program).
 * Each statement is small enough to execute individually via MCP.
 * Also generates a combined file wrapped in a transaction.
 *
 * Usage:
 *   npx tsx scripts/import-incentives/generate-single-sql.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function deriveTypeDisplay(programCode: string): string {
  const prefix = programCode.match(/^[A-Z]+/)?.[0] || '';
  switch (prefix) {
    case 'F': case 'FED': return 'federal';
    case 'S': return 'state';
    case 'U': return 'utility';
    case 'R': return 'regional';
    case 'C': return 'utility';
    case 'AQ': return 'local';
    case 'M': case 'CITY': return 'local';
    case 'NGO': return 'local';
    case 'N': case 'O': return 'financing';
    case 'W': return 'utility';
    default: return 'state';
  }
}

function esc(s: string | null | undefined): string {
  if (s === null || s === undefined) return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlArray(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return 'NULL';
  return `ARRAY[${arr.map(s => esc(s)).join(',')}]::text[]`;
}

function sqlJsonb(obj: any): string {
  if (obj === null || obj === undefined) return 'NULL';
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function sqlNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'NULL';
  return String(n);
}

function sqlBool(b: boolean | null | undefined): string {
  if (b === null || b === undefined) return 'false';
  return b ? 'true' : 'false';
}

function sqlDate(d: string | null | undefined): string {
  if (!d) return 'NULL';
  return esc(d);
}

function sqlInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'NULL';
  return String(Math.round(n));
}

const filePath = resolve(__dirname, '../../docs/CA Electrification Programs.json');
console.error(`Reading: ${filePath}`);

const raw = readFileSync(filePath, 'utf-8');
const data = JSON.parse(raw);
const programs = data.programs;
console.error(`Found ${programs.length} programs`);

const columns = [
  'program_name', 'program_code', 'description', 'program_type', 'program_type_display',
  'available_states', 'available_zip_codes', 'available_utilities',
  'available_nationwide', 'rebate_amount', 'rebate_percentage', 'max_rebate',
  'requirements', 'income_qualified', 'income_limits',
  'valid_from', 'valid_until', 'application_url', 'application_process',
  'typical_processing_days', 'stackable', 'cannot_stack_with',
  'is_active', 'last_verified', 'discovered_by', 'discovery_source_url',
];

const updateCols = columns.filter(c => c !== 'program_code');
const updateSet = updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ');

// Generate individual SQL files per program
for (let i = 0; i < programs.length; i++) {
  const p = programs[i];
  const isNationwide = p.available_states?.includes('ALL') || p.available_nationwide === true;
  let transformedStates: string[] | null = null;
  if (p.available_states && p.available_states.length > 0 && !p.available_states.includes('ALL')) {
    transformedStates = p.available_states.map((s: string) => STATE_CODE_MAP[s] || s);
  }
  const typeDisplay = deriveTypeDisplay(p.program_code);

  const sql = `INSERT INTO incentive_program_database (${columns.join(', ')})
VALUES (
  ${esc(p.program_name)}, ${esc(p.program_code)}, ${esc(p.description)},
  ${esc(p.program_type)}, ${esc(typeDisplay)},
  ${sqlArray(transformedStates)}, ${sqlArray(p.available_zip_codes)}, ${sqlArray(p.available_utilities)},
  ${sqlBool(isNationwide)}, ${sqlNum(p.rebate_amount)}, ${sqlNum(p.rebate_percentage)}, ${sqlNum(p.max_rebate)},
  ${sqlJsonb(p.requirements)}, ${sqlBool(p.income_qualified)}, ${sqlJsonb(p.income_limits)},
  ${sqlDate(p.valid_from)}, ${sqlDate(p.valid_until)}, ${esc(p.application_url)}, ${esc(p.application_process)},
  ${sqlInt(p.typical_processing_days)}, ${sqlBool(p.stackable)}, ${sqlArray(p.cannot_stack_with)},
  ${sqlBool(p.is_active)}, ${sqlDate(p.last_verified)}, 'admin', ${esc(p.discovery_source_url)}
)
ON CONFLICT (program_code) DO UPDATE SET ${updateSet}, updated_at = now();`;

  writeFileSync(`/tmp/ca-prog-${i + 1}.sql`, sql, 'utf-8');
}

// Also generate combined transaction file
const allSqls: string[] = ['BEGIN;'];
for (let i = 0; i < programs.length; i++) {
  allSqls.push(readFileSync(`/tmp/ca-prog-${i + 1}.sql`, 'utf-8'));
}
allSqls.push('COMMIT;');
writeFileSync('/tmp/ca-import-all.sql', allSqls.join('\n\n'), 'utf-8');

console.error(`Generated ${programs.length} individual SQL files: /tmp/ca-prog-1.sql .. /tmp/ca-prog-${programs.length}.sql`);
console.error(`Combined transaction: /tmp/ca-import-all.sql`);

// Print stats
const sizes = programs.map((_: any, i: number) => {
  const content = readFileSync(`/tmp/ca-prog-${i + 1}.sql`, 'utf-8');
  return content.length;
});
const maxSize = Math.max(...sizes);
const avgSize = sizes.reduce((a: number, b: number) => a + b, 0) / sizes.length;
console.error(`SQL sizes: avg=${Math.round(avgSize)} chars, max=${maxSize} chars`);
