-- Check recent contractor bids
SELECT 
  id, 
  project_id, 
  contractor_name, 
  total_price, 
  status,
  created_at
FROM contractor_bids 
ORDER BY created_at DESC 
LIMIT 5;

-- Check bid line items for most recent bid
SELECT 
  bli.id,
  bli.bid_id,
  bli.item_type,
  bli.description,
  bli.quantity,
  bli.unit_price,
  bli.total_price
FROM bid_line_items bli
JOIN contractor_bids cb ON bli.bid_id = cb.id
ORDER BY cb.created_at DESC, bli.line_order
LIMIT 10;

-- Check bid equipment for most recent bid
SELECT 
  be.id,
  be.bid_id,
  be.equipment_type,
  be.brand,
  be.model_number,
  be.seer_rating,
  be.capacity_btu
FROM bid_equipment be
JOIN contractor_bids cb ON be.bid_id = cb.id
ORDER BY cb.created_at DESC
LIMIT 5;

-- Check bid questions for most recent bid
SELECT 
  bq.id,
  bq.bid_id,
  bq.question_text,
  bq.question_category,
  bq.priority
FROM bid_questions bq
JOIN contractor_bids cb ON bq.bid_id = cb.id
ORDER BY cb.created_at DESC, bq.display_order
LIMIT 10;

-- Check pdf_uploads status
SELECT 
  id,
  project_id,
  file_name,
  status,
  mindpal_status,
  created_at
FROM pdf_uploads
ORDER BY created_at DESC
LIMIT 5;

-- Check workflow_monitoring
SELECT 
  id,
  project_id,
  workflow_run_id,
  status,
  created_at
FROM workflow_monitoring
ORDER BY created_at DESC
LIMIT 5;
