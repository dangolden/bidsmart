/**
 * QII (Quality Installation Inspection) Checklist Items
 *
 * Hardcoded constant array — V2 removed the qii_checklist_items DB table.
 * The project_qii_checklist table references these by item_key (TEXT).
 * Based on ACCA/ANSI Quality Installation standards.
 */

import type { QIIChecklistItem, QIICategory } from '../types';

export const QII_CHECKLIST_ITEMS: QIIChecklistItem[] = [
  // ── Pre-Installation ──────────────────────────────────
  {
    item_key: 'manual_j',
    category: 'pre_installation',
    item_text: 'Manual J load calculation performed',
    description: 'Contractor provided heating and cooling load calculations specific to your home',
    why_it_matters: 'Ensures the system is properly sized. Oversized systems short-cycle, waste energy, and fail to dehumidify. Undersized systems can\'t keep up.',
    is_critical: true,
    display_order: 1,
  },
  {
    item_key: 'manual_d',
    category: 'pre_installation',
    item_text: 'Manual D duct design reviewed (if applicable)',
    description: 'Duct sizing calculations for proper airflow',
    why_it_matters: 'Improperly sized ducts restrict airflow, reducing efficiency and comfort.',
    is_critical: false,
    display_order: 2,
  },
  {
    item_key: 'permit_pulled',
    category: 'pre_installation',
    item_text: 'Building permit obtained',
    description: 'Contractor pulled required permits before starting work',
    why_it_matters: 'Permits ensure work is inspected and meets code. Unpermitted work can affect insurance and resale.',
    is_critical: true,
    display_order: 3,
  },

  // ── Equipment Verification ────────────────────────────
  {
    item_key: 'model_matches',
    category: 'equipment',
    item_text: 'Installed equipment matches bid specifications',
    description: 'The actual equipment installed matches what was quoted',
    why_it_matters: 'Ensures you received what you paid for, including efficiency ratings.',
    is_critical: true,
    display_order: 10,
  },
  {
    item_key: 'ahri_matched',
    category: 'equipment',
    item_text: 'Indoor and outdoor units are AHRI-matched',
    description: 'The indoor and outdoor components are certified to work together',
    why_it_matters: 'Mismatched components may not achieve rated efficiency and can void warranties.',
    is_critical: true,
    display_order: 11,
  },
  {
    item_key: 'serial_documented',
    category: 'equipment',
    item_text: 'Equipment serial numbers documented',
    description: 'Serial numbers recorded for warranty registration',
    why_it_matters: 'Required for warranty claims and proves equipment is new.',
    is_critical: true,
    display_order: 12,
  },

  // ── Airflow ───────────────────────────────────────────
  {
    item_key: 'static_pressure',
    category: 'airflow',
    item_text: 'Static pressure tested and within spec',
    description: 'Duct system pressure measured and verified under 0.5" WC',
    why_it_matters: 'High static pressure reduces efficiency, increases noise, and shortens equipment life.',
    is_critical: true,
    display_order: 20,
  },
  {
    item_key: 'airflow_verified',
    category: 'airflow',
    item_text: 'Airflow (CFM) verified at each register',
    description: 'Measured airflow at supply registers matches design',
    why_it_matters: 'Proper airflow ensures each room receives adequate heating and cooling.',
    is_critical: false,
    display_order: 21,
  },
  {
    item_key: 'filter_sized',
    category: 'airflow',
    item_text: 'Filter properly sized and accessible',
    description: 'Filter is correct size with easy access for replacement',
    why_it_matters: 'Proper filtration protects equipment and improves air quality.',
    is_critical: false,
    display_order: 22,
  },

  // ── Refrigerant ───────────────────────────────────────
  {
    item_key: 'charge_verified',
    category: 'refrigerant',
    item_text: 'Refrigerant charge verified',
    description: 'Superheat/subcooling measured and adjusted to manufacturer specs',
    why_it_matters: 'Improper charge reduces efficiency by 5-20% and can damage the compressor.',
    is_critical: true,
    display_order: 30,
  },
  {
    item_key: 'no_leaks',
    category: 'refrigerant',
    item_text: 'System tested for refrigerant leaks',
    description: 'Pressure test or electronic leak detection performed',
    why_it_matters: 'Leaks reduce efficiency, harm the environment, and lead to expensive repairs.',
    is_critical: true,
    display_order: 31,
  },
  {
    item_key: 'linesets_insulated',
    category: 'refrigerant',
    item_text: 'Refrigerant lines properly insulated',
    description: 'Suction line insulated from outdoor unit to indoor coil',
    why_it_matters: 'Uninsulated lines reduce efficiency and can cause condensation damage.',
    is_critical: false,
    display_order: 32,
  },

  // ── Electrical ────────────────────────────────────────
  {
    item_key: 'breaker_sized',
    category: 'electrical',
    item_text: 'Circuit breaker properly sized',
    description: 'Electrical circuit matches equipment requirements',
    why_it_matters: 'Undersized circuits trip frequently; oversized circuits are a fire hazard.',
    is_critical: true,
    display_order: 40,
  },
  {
    item_key: 'disconnect_installed',
    category: 'electrical',
    item_text: 'Outdoor disconnect installed',
    description: 'Service disconnect within sight of outdoor unit',
    why_it_matters: 'Required by code for safe equipment servicing.',
    is_critical: true,
    display_order: 41,
  },
  {
    item_key: 'wiring_secured',
    category: 'electrical',
    item_text: 'All wiring properly secured and protected',
    description: 'Electrical connections tight and wiring protected from damage',
    why_it_matters: 'Loose connections cause failures; exposed wiring is a safety hazard.',
    is_critical: false,
    display_order: 42,
  },

  // ── Commissioning & Closeout ──────────────────────────
  {
    item_key: 'thermostat_programmed',
    category: 'commissioning',
    item_text: 'Thermostat properly programmed',
    description: 'Settings configured for optimal comfort and efficiency',
    why_it_matters: 'Proper programming maximizes savings without sacrificing comfort.',
    is_critical: false,
    display_order: 50,
  },
  {
    item_key: 'homeowner_training',
    category: 'commissioning',
    item_text: 'Homeowner training provided',
    description: 'Contractor explained system operation, filter changes, and maintenance',
    why_it_matters: 'Informed homeowners maintain systems better and catch problems early.',
    is_critical: false,
    display_order: 51,
  },
];

/** Lookup a QII item by its item_key */
export function getQIIItem(itemKey: string): QIIChecklistItem | undefined {
  return QII_CHECKLIST_ITEMS.find(item => item.item_key === itemKey);
}

/** Get all QII items for a given category */
export function getQIIItemsByCategory(category: QIICategory): QIIChecklistItem[] {
  return QII_CHECKLIST_ITEMS.filter(item => item.category === category);
}

/** Category display metadata */
export const QII_CATEGORY_INFO: Record<QIICategory, { label: string; description: string; icon: string }> = {
  pre_installation: {
    label: 'Pre-Installation',
    description: 'Verify these items before work begins',
    icon: '\u{1F4CB}',
  },
  equipment: {
    label: 'Equipment Verification',
    description: 'Confirm the right equipment was delivered and installed',
    icon: '\u{1F527}',
  },
  airflow: {
    label: 'Airflow',
    description: 'Proper airflow is critical for efficiency and comfort',
    icon: '\u{1F4A8}',
  },
  refrigerant: {
    label: 'Refrigerant',
    description: 'Correct refrigerant charge affects efficiency and equipment life',
    icon: '\u{2744}\u{FE0F}',
  },
  electrical: {
    label: 'Electrical',
    description: 'Safe and proper electrical connections',
    icon: '\u{26A1}',
  },
  commissioning: {
    label: 'Commissioning & Closeout',
    description: 'Final steps to ensure everything is documented',
    icon: '\u{2705}',
  },
};
