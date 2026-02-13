// Quick script to check MindPal data insertion
const projectId = '4a0a56f3-ed71-4eba-8372-d5b9fcb4476c';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jzvmlgahptwixtrleaco.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

async function checkData() {
  console.log(`\n=== Checking data for project: ${projectId} ===\n`);

  // Check contractor_bids
  const bidsRes = await fetch(`${SUPABASE_URL}/rest/v1/contractor_bids?project_id=eq.${projectId}&select=id,contractor_name,total_price,status,created_at`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const bids = await bidsRes.json();
  console.log(`📊 Contractor Bids: ${bids.length} records`);
  bids.forEach(bid => {
    console.log(`  - ${bid.contractor_name}: $${bid.total_price} (${bid.status})`);
  });

  if (bids.length === 0) {
    console.log('\n❌ No bids found! MindPal may not have inserted data.');
    return;
  }

  const bidIds = bids.map(b => b.id).join(',');

  // Check bid_line_items
  const lineItemsRes = await fetch(`${SUPABASE_URL}/rest/v1/bid_line_items?bid_id=in.(${bidIds})&select=count`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  const lineItemsCount = lineItemsRes.headers.get('content-range')?.split('/')[1] || 0;
  console.log(`\n📋 Bid Line Items: ${lineItemsCount} records`);

  // Check bid_equipment
  const equipmentRes = await fetch(`${SUPABASE_URL}/rest/v1/bid_equipment?bid_id=in.(${bidIds})&select=count`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  const equipmentCount = equipmentRes.headers.get('content-range')?.split('/')[1] || 0;
  console.log(`🔧 Bid Equipment: ${equipmentCount} records`);

  // Check bid_questions
  const questionsRes = await fetch(`${SUPABASE_URL}/rest/v1/bid_questions?bid_id=in.(${bidIds})&select=count`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  const questionsCount = questionsRes.headers.get('content-range')?.split('/')[1] || 0;
  console.log(`❓ Bid Questions: ${questionsCount} records`);

  // Check pdf_uploads
  const pdfRes = await fetch(`${SUPABASE_URL}/rest/v1/pdf_uploads?project_id=eq.${projectId}&select=id,file_name,status,mindpal_status`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const pdfs = await pdfRes.json();
  console.log(`\n📄 PDF Uploads: ${pdfs.length} records`);
  pdfs.forEach(pdf => {
    console.log(`  - ${pdf.file_name}: ${pdf.status} / mindpal: ${pdf.mindpal_status}`);
  });

  // Check workflow_monitoring
  const workflowRes = await fetch(`${SUPABASE_URL}/rest/v1/workflow_monitoring?project_id=eq.${projectId}&select=id,workflow_run_id,status`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const workflows = await workflowRes.json();
  console.log(`\n⚙️ Workflow Monitoring: ${workflows.length} records`);
  workflows.forEach(wf => {
    console.log(`  - Run ID: ${wf.workflow_run_id}, Status: ${wf.status}`);
  });

  console.log('\n=== Summary ===');
  console.log(`✅ Bids: ${bids.length}`);
  console.log(`${lineItemsCount > 0 ? '✅' : '❌'} Line Items: ${lineItemsCount}`);
  console.log(`${equipmentCount > 0 ? '✅' : '❌'} Equipment: ${equipmentCount}`);
  console.log(`${questionsCount > 0 ? '✅' : '❌'} Questions: ${questionsCount}`);
  console.log(`${pdfs.length > 0 ? '✅' : '❌'} PDFs: ${pdfs.length}`);
  console.log(`${workflows.length > 0 ? '✅' : '❌'} Workflow Monitoring: ${workflows.length}`);
}

checkData().catch(console.error);
