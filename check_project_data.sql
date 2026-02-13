-- Check data for project 4a0a56f3-ed71-4eba-8372-d5b9fcb4476c

-- Contractor Bids
SELECT 
  'contractor_bids' as table_name,
  COUNT(*) as record_count
FROM contractor_bids 
WHERE project_id = '4a0a56f3-ed71-4eba-8372-d5b9fcb4476c';

-- Bid Line Items (via contractor_bids)
SELECT 
  'bid_line_items' as table_name,
  COUNT(*) as record_count
FROM bid_line_items bli
JOIN contractor_bids cb ON bli.bid_id = cb.id
WHERE cb.project_id = '4a0a56f3-ed71-4eba-8372-d5b9fcb4476c';

-- Bid Equipment
SELECT 
  'bid_equipment' as table_name,
  COUNT(*) as record_count
FROM bid_equipment be
JOIN contractor_bids cb ON be.bid_id = cb.id
WHERE cb.project_id = '4a0a56f3-ed71-4eba-8372-d5b9fcb4476c';

-- Bid Questions
SELECT 
  'bid_questions' as table_name,
  COUNT(*) as record_count
FROM bid_questions bq
JOIN contractor_bids cb ON bq.bid_id = cb.id
WHERE cb.project_id = '4a0a56f3-ed71-4eba-8372-d5b9fcb4476c';

-- PDF Uploads
SELECT 
  'pdf_uploads' as table_name,
  COUNT(*) as record_count
FROM pdf_uploads
WHERE project_id = '4a0a56f3-ed71-4eba-8372-d5b9fcb4476c';

-- Workflow Monitoring
SELECT 
  'workflow_monitoring' as table_name,
  COUNT(*) as record_count
FROM workflow_monitoring
WHERE project_id = '4a0a56f3-ed71-4eba-8372-d5b9fcb4476c';

-- Detailed contractor bids
SELECT 
  id,
  contractor_name,
  total_price,
  status,
  created_at
FROM contractor_bids 
WHERE project_id = '4a0a56f3-ed71-4eba-8372-d5b9fcb4476c'
ORDER BY created_at DESC;
