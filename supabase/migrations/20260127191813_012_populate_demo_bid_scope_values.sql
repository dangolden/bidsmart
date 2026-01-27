/*
  # Populate Demo Bid Scope Values

  This migration updates the existing demo bids with realistic scope boolean values
  so the "Scope Included" comparison tab displays meaningful data.

  1. Changes
    - Updates "Bay Area Heat Pump Pros" bid with scope values (premium install, no ductwork)
    - Updates "GreenTech HVAC Solutions" bid with scope values (basic install, no electrical upgrade)
    - Updates "Comfort First Heating & Cooling" bid with scope values (full-service install)

  2. Scope Field Meanings
    - scope_permit_included: Building permit handling
    - scope_disposal_included: Old equipment removal/disposal
    - scope_electrical_included: Electrical panel/circuit work
    - scope_ductwork_included: Ductwork modifications
    - scope_thermostat_included: New thermostat
    - scope_manual_j_included: Load calculation
    - scope_commissioning_included: System startup/testing
    - scope_air_handler_included: Indoor air handler
    - scope_line_set_included: Refrigerant lines
    - scope_disconnect_included: Outdoor disconnect
    - scope_pad_included: Condenser pad
    - scope_drain_line_included: Condensate drain

  3. Notes
    - Values are set to create realistic differentiation between bids
    - Lower-priced bid (GreenTech) excludes electrical work
    - Mid-priced bid (Bay Area) excludes ductwork and Manual J
    - Premium bid (Comfort First) includes everything
*/

-- Bay Area Heat Pump Pros ($18,500) - Good coverage, excludes ductwork and Manual J
UPDATE contractor_bids
SET 
  scope_permit_included = true,
  scope_disposal_included = true,
  scope_electrical_included = true,
  scope_ductwork_included = false,
  scope_thermostat_included = true,
  scope_manual_j_included = false,
  scope_commissioning_included = true,
  scope_air_handler_included = true,
  scope_line_set_included = true,
  scope_disconnect_included = true,
  scope_pad_included = true,
  scope_drain_line_included = true,
  updated_at = now()
WHERE contractor_name = 'Bay Area Heat Pump Pros'
  AND project_id IN (SELECT id FROM projects WHERE is_public_demo = true);

-- GreenTech HVAC Solutions ($16,800) - Budget option, no electrical upgrade
UPDATE contractor_bids
SET 
  scope_permit_included = true,
  scope_disposal_included = true,
  scope_electrical_included = false,
  scope_ductwork_included = false,
  scope_thermostat_included = true,
  scope_manual_j_included = true,
  scope_commissioning_included = true,
  scope_air_handler_included = true,
  scope_line_set_included = true,
  scope_disconnect_included = true,
  scope_pad_included = true,
  scope_drain_line_included = true,
  updated_at = now()
WHERE contractor_name = 'GreenTech HVAC Solutions'
  AND project_id IN (SELECT id FROM projects WHERE is_public_demo = true);

-- Comfort First Heating & Cooling ($21,500) - Premium, includes everything
UPDATE contractor_bids
SET 
  scope_permit_included = true,
  scope_disposal_included = true,
  scope_electrical_included = true,
  scope_ductwork_included = true,
  scope_thermostat_included = true,
  scope_manual_j_included = true,
  scope_commissioning_included = true,
  scope_air_handler_included = true,
  scope_line_set_included = true,
  scope_disconnect_included = true,
  scope_pad_included = true,
  scope_drain_line_included = true,
  updated_at = now()
WHERE contractor_name = 'Comfort First Heating & Cooling'
  AND project_id IN (SELECT id FROM projects WHERE is_public_demo = true);