#!/bin/bash

# Quick verification script for MindPal data insertion
echo "=== Checking MindPal Data Insertion ==="
echo ""

# Get the most recent project_id from contractor_bids
echo "📊 Recent Contractor Bids:"
echo "SELECT id, project_id, contractor_name, total_price, status, created_at FROM contractor_bids ORDER BY created_at DESC LIMIT 3;" | supabase db remote execute

echo ""
echo "📋 Bid Line Items Count:"
echo "SELECT cb.contractor_name, COUNT(bli.id) as line_items_count FROM contractor_bids cb LEFT JOIN bid_line_items bli ON cb.id = bli.bid_id WHERE cb.created_at > NOW() - INTERVAL '1 hour' GROUP BY cb.id, cb.contractor_name ORDER BY cb.created_at DESC;" | supabase db remote execute

echo ""
echo "🔧 Bid Equipment Count:"
echo "SELECT cb.contractor_name, COUNT(be.id) as equipment_count FROM contractor_bids cb LEFT JOIN bid_equipment be ON cb.id = be.bid_id WHERE cb.created_at > NOW() - INTERVAL '1 hour' GROUP BY cb.id, cb.contractor_name ORDER BY cb.created_at DESC;" | supabase db remote execute

echo ""
echo "❓ Bid Questions Count:"
echo "SELECT cb.contractor_name, COUNT(bq.id) as questions_count FROM contractor_bids cb LEFT JOIN bid_questions bq ON cb.id = bq.bid_id WHERE cb.created_at > NOW() - INTERVAL '1 hour' GROUP BY cb.id, cb.contractor_name ORDER BY cb.created_at DESC;" | supabase db remote execute

echo ""
echo "📄 PDF Upload Status:"
echo "SELECT id, file_name, status, mindpal_status, created_at FROM pdf_uploads ORDER BY created_at DESC LIMIT 3;" | supabase db remote execute

echo ""
echo "⚙️ Workflow Monitoring:"
echo "SELECT id, project_id, workflow_run_id, status, created_at FROM workflow_monitoring ORDER BY created_at DESC LIMIT 3;" | supabase db remote execute
