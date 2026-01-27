/*
  # Add Structured Scope Boolean Columns to contractor_bids

  1. Purpose
    - Enable side-by-side comparison grid showing which scope items each bid includes
    - Support MindPal extraction of structured scope data from PDF bids
    - Allow intelligent question generation based on scope differences between bids

  2. New Columns Added to contractor_bids
    - scope_permit_included (boolean) - Whether permit fees and filing are included
    - scope_disposal_included (boolean) - Whether old equipment disposal is included
    - scope_electrical_included (boolean) - Whether electrical work (circuit, disconnect) is included
    - scope_ductwork_included (boolean) - Whether ductwork modifications are included
    - scope_thermostat_included (boolean) - Whether new thermostat is included
    - scope_manual_j_included (boolean) - Whether Manual J load calculation is included
    - scope_commissioning_included (boolean) - Whether system commissioning/startup is included
    - scope_air_handler_included (boolean) - Whether air handler replacement is included
    - scope_line_set_included (boolean) - Whether new refrigerant line set is included
    - scope_disconnect_included (boolean) - Whether electrical disconnect is included
    - scope_pad_included (boolean) - Whether equipment pad is included
    - scope_drain_line_included (boolean) - Whether condensate drain line is included

  3. Default Values
    - All columns default to NULL (unknown until extracted or user-verified)
    - NULL means "not specified in bid" vs FALSE means "explicitly excluded"

  4. Notes
    - These booleans enable a comparison matrix view in the frontend
    - MindPal will populate these during bid extraction
    - Users can manually verify/override if needed
*/

-- Add scope boolean columns to contractor_bids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_permit_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_permit_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_disposal_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_disposal_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_electrical_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_electrical_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_ductwork_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_ductwork_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_thermostat_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_thermostat_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_manual_j_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_manual_j_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_commissioning_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_commissioning_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_air_handler_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_air_handler_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_line_set_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_line_set_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_disconnect_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_disconnect_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_pad_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_pad_included boolean DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractor_bids' AND column_name = 'scope_drain_line_included'
  ) THEN
    ALTER TABLE contractor_bids ADD COLUMN scope_drain_line_included boolean DEFAULT NULL;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN contractor_bids.scope_permit_included IS 'Whether permit fees and filing are included in bid';
COMMENT ON COLUMN contractor_bids.scope_disposal_included IS 'Whether old equipment disposal is included in bid';
COMMENT ON COLUMN contractor_bids.scope_electrical_included IS 'Whether electrical work (circuit, disconnect) is included';
COMMENT ON COLUMN contractor_bids.scope_ductwork_included IS 'Whether ductwork modifications are included';
COMMENT ON COLUMN contractor_bids.scope_thermostat_included IS 'Whether new thermostat is included';
COMMENT ON COLUMN contractor_bids.scope_manual_j_included IS 'Whether Manual J load calculation is included';
COMMENT ON COLUMN contractor_bids.scope_commissioning_included IS 'Whether system commissioning/startup is included';
COMMENT ON COLUMN contractor_bids.scope_air_handler_included IS 'Whether air handler replacement is included';
COMMENT ON COLUMN contractor_bids.scope_line_set_included IS 'Whether new refrigerant line set is included';
COMMENT ON COLUMN contractor_bids.scope_disconnect_included IS 'Whether electrical disconnect is included';
COMMENT ON COLUMN contractor_bids.scope_pad_included IS 'Whether equipment pad is included';
COMMENT ON COLUMN contractor_bids.scope_drain_line_included IS 'Whether condensate drain line is included';
