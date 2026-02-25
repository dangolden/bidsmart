/**
 * Execute SQL batch files against Supabase using the pg REST endpoint.
 * Uses the Supabase management API via service_role key.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-incentives/run-sql-batches.ts
 *
 * Or with project_ref + access_token (from `supabase login`):
 *   PROJECT_REF=zsfsuzlwsvgfklbtpwmu npx tsx scripts/import-incentives/run-sql-batches.ts
 */

import { readFileSync, existsSync } from 'fs';

const PROJECT_REF = 'zsfsuzlwsvgfklbtpwmu';

async function executeSqlViaManagementApi(sql: string): Promise<any> {
  // Use the Supabase Management API to execute SQL
  // This requires a personal access token (from `supabase login` or dashboard)
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('SUPABASE_ACCESS_TOKEN env var required. Get it from: supabase.com/dashboard/account/tokens');
  }

  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }

  return resp.json();
}

async function executeSqlViaPostgrest(sql: string): Promise<any> {
  const url = process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required');
  }

  const resp = await fetch(`${url}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }

  return resp.json();
}

async function main() {
  // Check which batch files exist
  const batchFiles: string[] = [];

  // Check for transaction batch files first
  for (let i = 1; i <= 50; i++) {
    const path = `/tmp/ca-batch-tx-${i}.sql`;
    if (existsSync(path)) {
      batchFiles.push(path);
    } else {
      break;
    }
  }

  if (batchFiles.length === 0) {
    console.error('No batch files found. Run generate-single-sql.ts first.');
    process.exit(1);
  }

  console.log(`Found ${batchFiles.length} batch files`);

  // Determine which API to use
  const useManagementApi = !!process.env.SUPABASE_ACCESS_TOKEN;
  const usePostgrest = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!useManagementApi && !usePostgrest) {
    console.error('Need either SUPABASE_ACCESS_TOKEN or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const executeSql = useManagementApi ? executeSqlViaManagementApi : executeSqlViaPostgrest;
  console.log(`Using: ${useManagementApi ? 'Management API' : 'PostgREST'}`);

  let totalSuccess = 0;
  let totalErrors = 0;

  for (const file of batchFiles) {
    const sql = readFileSync(file, 'utf-8');
    const batchName = file.split('/').pop();
    console.log(`\nExecuting ${batchName} (${sql.length} chars)...`);

    try {
      const result = await executeSql(sql);
      console.log(`  ✓ Success`);
      totalSuccess++;
    } catch (err: any) {
      console.error(`  ✗ Error: ${err.message}`);
      totalErrors++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Success: ${totalSuccess}/${batchFiles.length}`);
  console.log(`Errors: ${totalErrors}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
