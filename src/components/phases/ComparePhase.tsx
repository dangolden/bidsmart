import { useState } from 'react';
import { ArrowRight, Award, Zap, DollarSign, Star, CheckCircle, XCircle, ChevronDown, ChevronUp, HelpCircle, FlaskConical, Download, Mail, Loader2 } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';
import { useUser } from '../../hooks/useUser';
import { formatCurrency, formatDate } from '../../lib/utils/formatters';

type CompareTab = 'equipment' | 'contractors' | 'costs';

interface TabConfig {
  key: CompareTab;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const LABEL_COL_WIDTH = '200px';
const BID_COL_MIN_WIDTH = '180px';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function ComparePhase() {
  const { bids, completePhase, projectId } = usePhase();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<CompareTab>('equipment');
  const [showMoreEquipment, setShowMoreEquipment] = useState(false);
  const [showMoreContractors, setShowMoreContractors] = useState(false);
  const [showFinancingDetails, setShowFinancingDetails] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [emailingReport, setEmailingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const formatDateDisplay = (dateString: string | null | undefined) => {
    return formatDate(dateString) || '-';
  };

  const getHighestValue = (
    values: (number | null | undefined)[],
    higherIsBetter = true
  ): number | null => {
    const validValues = values.filter((v): v is number => v != null);
    if (validValues.length === 0) return null;
    return higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
  };

  const isHighlighted = (
    value: number | null | undefined,
    bestValue: number | null
  ): boolean => {
    if (value == null || bestValue == null) return false;
    return value === bestValue;
  };

  const tabs: TabConfig[] = [
    {
      key: 'equipment',
      label: 'Equipment',
      description: 'Specs, efficiency ratings, and features',
      icon: <Zap className="w-5 h-5" />
    },
    {
      key: 'contractors',
      label: 'Contractors',
      description: 'Experience, ratings, and certifications',
      icon: <Award className="w-5 h-5" />
    },
    {
      key: 'costs',
      label: 'Cost & Scope',
      description: 'Pricing, warranties, and what\'s included',
      icon: <DollarSign className="w-5 h-5" />
    },
  ];

  const getEquipmentData = () => {
    return bids.map((b) => {
      const mainEquipment = b.equipment.find(
        (e) => e.equipment_type === 'outdoor_unit' || e.equipment_type === 'heat_pump'
      ) || b.equipment[0];

      return {
        bidId: b.bid.id,
        contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
        brand: mainEquipment?.brand || '-',
        model: mainEquipment?.model_number || mainEquipment?.model_name || '-',
        seer2: mainEquipment?.seer2_rating || mainEquipment?.seer_rating,
        hspf2: mainEquipment?.hspf2_rating || mainEquipment?.hspf_rating,
        capacityTons: mainEquipment?.capacity_tons,
        capacityBtu: mainEquipment?.capacity_btu,
        variableSpeed: mainEquipment?.variable_speed,
        soundLevel: mainEquipment?.sound_level_db,
        energyStar: mainEquipment?.energy_star_certified,
        energyStarMostEfficient: mainEquipment?.energy_star_most_efficient,
        refrigerantType: mainEquipment?.refrigerant_type,
        voltage: mainEquipment?.voltage,
        stages: mainEquipment?.stages,
        cop: mainEquipment?.cop,
        eer: mainEquipment?.eer_rating,
        compressorWarranty: mainEquipment?.compressor_warranty_years,
      };
    });
  };

  const getContractorData = () => {
    return bids.map((b) => ({
      bidId: b.bid.id,
      contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
      yearsInBusiness: b.bid.contractor_years_in_business,
      yearEstablished: b.bid.contractor_year_established,
      googleRating: b.bid.contractor_google_rating,
      reviewCount: b.bid.contractor_google_review_count,
      switchRating: b.bid.contractor_switch_rating,
      certifications: b.bid.contractor_certifications || [],
      license: b.bid.contractor_license,
      licenseState: b.bid.contractor_license_state,
      insuranceVerified: b.bid.contractor_insurance_verified,
      isSwitchPreferred: b.bid.contractor_is_switch_preferred,
      phone: b.bid.contractor_phone,
      email: b.bid.contractor_email,
      website: b.bid.contractor_website,
      totalInstalls: b.bid.contractor_total_installs,
      // New MindPal extraction fields
      yelpRating: b.bid.contractor_yelp_rating,
      yelpReviewCount: b.bid.contractor_yelp_review_count,
      bbbRating: b.bid.contractor_bbb_rating,
      bbbAccredited: b.bid.contractor_bbb_accredited,
      bbbComplaints: b.bid.contractor_bbb_complaints_3yr,
      bonded: b.bid.contractor_bonded,
      contactName: b.bid.contractor_contact_name,
      address: b.bid.contractor_address,
      redFlags: b.bid.red_flags || [],
      positiveIndicators: b.bid.positive_indicators || [],
    }));
  };

  const getCostData = () => {
    return bids.map((b) => ({
      bidId: b.bid.id,
      contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
      totalAmount: b.bid.total_bid_amount,
      equipmentCost: b.bid.equipment_cost,
      laborCost: b.bid.labor_cost,
      materialsCost: b.bid.materials_cost,
      permitCost: b.bid.permit_cost,
      laborWarranty: b.bid.labor_warranty_years,
      equipmentWarranty: b.bid.equipment_warranty_years,
      financingAvailable: b.bid.financing_offered,
      financingTerms: b.bid.financing_terms,
      exclusions: b.bid.exclusions || [],
      estimatedDays: b.bid.estimated_days,
      startDateAvailable: b.bid.start_date_available,
      validUntil: b.bid.valid_until,
      bidDate: b.bid.bid_date,
      depositRequired: b.bid.deposit_required,
      depositPercentage: b.bid.deposit_percentage,
      paymentSchedule: b.bid.payment_schedule,
    }));
  };

  const getScopeData = () => {
    return bids.map((b) => ({
      bidId: b.bid.id,
      contractor: b.bid.contractor_name || b.bid.contractor_company || 'Unknown',
      permit: b.bid.scope_permit_included,
      permitDetail: b.bid.scope_permit_detail,
      disposal: b.bid.scope_disposal_included,
      disposalDetail: b.bid.scope_disposal_detail,
      electrical: b.bid.scope_electrical_included,
      electricalDetail: b.bid.scope_electrical_detail,
      ductwork: b.bid.scope_ductwork_included,
      ductworkDetail: b.bid.scope_ductwork_detail,
      thermostat: b.bid.scope_thermostat_included,
      thermostatDetail: b.bid.scope_thermostat_detail,
      manualJ: b.bid.scope_manual_j_included,
      manualJDetail: b.bid.scope_manual_j_detail,
      commissioning: b.bid.scope_commissioning_included,
      commissioningDetail: b.bid.scope_commissioning_detail,
      airHandler: b.bid.scope_air_handler_included,
      airHandlerDetail: b.bid.scope_air_handler_detail,
      lineSet: b.bid.scope_line_set_included,
      lineSetDetail: b.bid.scope_line_set_detail,
      disconnect: b.bid.scope_disconnect_included,
      disconnectDetail: b.bid.scope_disconnect_detail,
      pad: b.bid.scope_pad_included,
      padDetail: b.bid.scope_pad_detail,
      drainLine: b.bid.scope_drain_line_included,
      drainLineDetail: b.bid.scope_drain_line_detail,
    }));
  };

  const equipmentData = getEquipmentData();
  const contractorData = getContractorData();
  const costData = getCostData();
  const scopeData = getScopeData();

  const bestSeer = getHighestValue(equipmentData.map((e) => e.seer2));
  const bestHspf = getHighestValue(equipmentData.map((e) => e.hspf2));
  const bestYears = getHighestValue(contractorData.map((c) => c.yearsInBusiness));
  const bestRating = getHighestValue(contractorData.map((c) => c.googleRating));
  const lowestPrice = getHighestValue(costData.map((c) => c.totalAmount), false);
  const bestLaborWarranty = getHighestValue(costData.map((c) => c.laborWarranty));
  const bestEquipmentWarranty = getHighestValue(costData.map((c) => c.equipmentWarranty));
  const fastestTimeline = getHighestValue(costData.map((c) => c.estimatedDays), false);

  const handleContinue = () => {
    completePhase(2);
  };

  const handleDownloadReport = async () => {
    if (!projectId || !user?.email) {
      alert('Missing project or user information');
      return;
    }

    setDownloadingReport(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pdf-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'X-User-Email': user.email,
        },
        body: JSON.stringify({
          project_id: projectId,
          send_email: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Report generation failed:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bidsmart-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      const message = error instanceof Error ? error.message : 'Failed to download report';
      alert(`Download failed: ${message}`);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleEmailReport = async () => {
    if (!projectId || !user?.email) {
      alert('Missing project or user information');
      return;
    }

    setEmailingReport(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pdf-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'X-User-Email': user.email,
        },
        body: JSON.stringify({
          project_id: projectId,
          send_email: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Email send failed:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);

      setReportSent(true);
      setTimeout(() => setReportSent(false), 5000);
    } catch (error) {
      console.error('Error emailing report:', error);
      const message = error instanceof Error ? error.message : 'Failed to send report';
      alert(`Email failed: ${message}`);
    } finally {
      setEmailingReport(false);
    }
  };

  const bidCount = bids.length;
  const tableMinWidth = `calc(${LABEL_COL_WIDTH} + (${bidCount} * ${BID_COL_MIN_WIDTH}))`;

  const labelCellStyle = { width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH, maxWidth: LABEL_COL_WIDTH };
  const bidCellStyle = { minWidth: BID_COL_MIN_WIDTH };

  const scopeItems = [
    { key: 'permit', detailKey: 'permitDetail', label: 'Permits & Filing' },
    { key: 'disposal', detailKey: 'disposalDetail', label: 'Old Equipment Disposal' },
    { key: 'electrical', detailKey: 'electricalDetail', label: 'Electrical Work' },
    { key: 'disconnect', detailKey: 'disconnectDetail', label: 'Electrical Disconnect' },
    { key: 'ductwork', detailKey: 'ductworkDetail', label: 'Ductwork Modifications' },
    { key: 'thermostat', detailKey: 'thermostatDetail', label: 'Thermostat' },
    { key: 'manualJ', detailKey: 'manualJDetail', label: 'Manual J Calculation' },
    { key: 'commissioning', detailKey: 'commissioningDetail', label: 'System Commissioning' },
    { key: 'airHandler', detailKey: 'airHandlerDetail', label: 'Air Handler' },
    { key: 'lineSet', detailKey: 'lineSetDetail', label: 'Refrigerant Line Set' },
    { key: 'pad', detailKey: 'padDetail', label: 'Equipment Pad' },
    { key: 'drainLine', detailKey: 'drainLineDetail', label: 'Condensate Drain Line' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare Your Bids</h1>
        <p className="text-gray-600 mt-1">
          Review the equipment, contractors, and costs side by side.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <FlaskConical className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <span className="font-medium">Alpha:</span> Some extracted data may be incomplete. If something looks wrong, please verify against the original bid document.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              relative p-3 sm:p-4 rounded-xl text-left transition-all duration-200 border-2
              ${activeTab === tab.key
                ? 'bg-gradient-to-br from-switch-green-50 to-switch-green-100 border-switch-green-500 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${activeTab === tab.key
                  ? 'bg-switch-green-600 text-white'
                  : 'bg-gray-100 text-gray-500'
                }
              `}>
                {tab.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`
                    text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap
                    ${activeTab === tab.key
                      ? 'bg-switch-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {index + 1} of 3
                  </span>
                </div>
                <h3 className={`
                  font-semibold mt-1 text-sm sm:text-base
                  ${activeTab === tab.key ? 'text-switch-green-800' : 'text-gray-900'}
                `}>
                  {tab.label}
                </h3>
                <p className={`
                  text-xs sm:text-sm mt-0.5 line-clamp-2
                  ${activeTab === tab.key ? 'text-switch-green-700' : 'text-gray-500'}
                `}>
                  {tab.description}
                </p>
              </div>
            </div>
            {activeTab === tab.key && (
              <div className="hidden sm:block absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                <div className="w-3 h-3 bg-switch-green-500 rotate-45"></div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
        <div className={`
          px-5 py-3 border-b-2 border-gray-200 flex items-center gap-3
          bg-gradient-to-r from-switch-green-600 to-switch-green-700
        `}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
            {tabs.find(t => t.key === activeTab)?.icon}
          </div>
          <h2 className="font-semibold text-white">
            {tabs.find(t => t.key === activeTab)?.label} Comparison
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
            {activeTab === 'equipment' && (
              <>
                <thead>
                  <tr className="bg-gray-900">
                    <th style={labelCellStyle} className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                      Specification
                    </th>
                    {equipmentData.map((e, idx) => (
                      <th key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < equipmentData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                        {e.contractor}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Manufacturer & Model</td>
                    {equipmentData.map((e, idx) => (
                      <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {e.brand} {e.model}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">SEER2 Rating</td>
                    {equipmentData.map((e, idx) => (
                      <td
                        key={e.bidId}
                        style={bidCellStyle}
                        className={`px-5 py-4 text-sm font-semibold ${isHighlighted(e.seer2, bestSeer) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          {e.seer2 || '-'}
                          {isHighlighted(e.seer2, bestSeer) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" /> BEST
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">HSPF2 Rating</td>
                    {equipmentData.map((e, idx) => (
                      <td
                        key={e.bidId}
                        style={bidCellStyle}
                        className={`px-5 py-4 text-sm font-semibold ${isHighlighted(e.hspf2, bestHspf) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          {e.hspf2 || '-'}
                          {isHighlighted(e.hspf2, bestHspf) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" /> BEST
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Capacity (tons)</td>
                    {equipmentData.map((e, idx) => (
                      <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {e.capacityTons || '-'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Variable Speed</td>
                    {equipmentData.map((e, idx) => (
                      <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {e.variableSpeed ? (
                          <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                            <CheckCircle className="w-5 h-5" /> Yes
                          </span>
                        ) : e.variableSpeed === false ? (
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <XCircle className="w-5 h-5" /> No
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Sound Level (dB)</td>
                    {equipmentData.map((e, idx) => (
                      <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {e.soundLevel || '-'}
                      </td>
                    ))}
                  </tr>
                  <tr className={showMoreEquipment ? 'border-b border-gray-200' : ''}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">ENERGY STAR</td>
                    {equipmentData.map((e, idx) => (
                      <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {e.energyStar ? (
                          <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                            <CheckCircle className="w-5 h-5" /> Certified
                          </span>
                        ) : e.energyStar === false ? (
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <XCircle className="w-5 h-5" /> No
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {showMoreEquipment && (
                    <>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Capacity (BTU)</td>
                        {equipmentData.map((e, idx) => (
                          <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {e.capacityBtu ? e.capacityBtu.toLocaleString() : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Refrigerant Type</td>
                        {equipmentData.map((e, idx) => (
                          <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {e.refrigerantType || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Voltage</td>
                        {equipmentData.map((e, idx) => (
                          <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {e.voltage ? `${e.voltage}V` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Stages</td>
                        {equipmentData.map((e, idx) => (
                          <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {e.stages || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">COP Rating</td>
                        {equipmentData.map((e, idx) => (
                          <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {e.cop || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">EER Rating</td>
                        {equipmentData.map((e, idx) => (
                          <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {e.eer || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Compressor Warranty</td>
                        {equipmentData.map((e, idx) => (
                          <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {e.compressorWarranty ? `${e.compressorWarranty} years` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Most Efficient</td>
                        {equipmentData.map((e, idx) => (
                          <td key={e.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < equipmentData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {e.energyStarMostEfficient ? (
                              <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                                <CheckCircle className="w-5 h-5" /> Yes
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </>
            )}

            {activeTab === 'contractors' && (
              <>
                <thead>
                  <tr className="bg-gray-900">
                    <th style={labelCellStyle} className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                      Information
                    </th>
                    {contractorData.map((c, idx) => (
                      <th key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < contractorData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                        {c.contractor}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Years in Business</td>
                    {contractorData.map((c, idx) => (
                      <td
                        key={c.bidId}
                        style={bidCellStyle}
                        className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.yearsInBusiness, bestYears) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          {c.yearsInBusiness ? `${c.yearsInBusiness} years` : '-'}
                          {isHighlighted(c.yearsInBusiness, bestYears) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" /> MOST
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Google Rating</td>
                    {contractorData.map((c, idx) => (
                      <td
                        key={c.bidId}
                        style={bidCellStyle}
                        className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.googleRating, bestRating) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          {c.googleRating ? (
                            <span className="flex items-center gap-1">
                              {c.googleRating}
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            </span>
                          ) : '-'}
                          {isHighlighted(c.googleRating, bestRating) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                              TOP
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Review Count</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.reviewCount ? `${c.reviewCount} reviews` : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <span>Switch Rating</span>
                        <span className="text-xs text-gray-500 font-normal">(verified homeowners)</span>
                      </div>
                    </td>
                    {contractorData.map((c, idx) => {
                      const bestSwitchRating = getHighestValue(contractorData.map((cd) => cd.switchRating), true);
                      return (
                        <td
                          key={c.bidId}
                          style={bidCellStyle}
                          className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.switchRating, bestSwitchRating) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}
                        >
                          {c.switchRating ? (
                            <span className="flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                {c.switchRating.toFixed(1)}
                                <Star className="w-4 h-4 text-switch-green-600 fill-switch-green-600" />
                              </span>
                              {isHighlighted(c.switchRating, bestSwitchRating) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                                  TOP
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No reviews yet</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Certifications</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.certifications.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.certifications.slice(0, 3).map((cert, i) => (
                              <span key={i} className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                {cert}
                              </span>
                            ))}
                            {c.certifications.length > 3 && (
                              <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                                +{c.certifications.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">License Number</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.license || <span className="text-gray-400">Not provided</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className={showMoreContractors ? 'border-b border-gray-200 bg-gray-50/50' : ''}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Switch Preferred</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.isSwitchPreferred ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-switch-green-500 to-switch-green-600 text-white rounded-full text-xs font-semibold shadow-sm">
                            <CheckCircle className="w-3.5 h-3.5" /> Preferred Partner
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {showMoreContractors && (
                    <>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Phone</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.phone || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Email</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.email ? (
                              <a href={`mailto:${c.email}`} className="text-switch-green-600 hover:underline truncate block">
                                {c.email}
                              </a>
                            ) : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Website</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.website ? (
                              <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-switch-green-600 hover:underline truncate block">
                                {c.website.replace(/^https?:\/\//, '')}
                              </a>
                            ) : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">License State</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.licenseState || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Insurance Verified</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.insuranceVerified ? (
                              <span className="inline-flex items-center gap-1 text-switch-green-700">
                                <CheckCircle className="w-4 h-4" /> Verified
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Year Established</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.yearEstablished || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Total Installs</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.totalInstalls ? c.totalInstalls.toLocaleString() : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Yelp Rating</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.yelpRating ? (
                              <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="font-semibold">{c.yelpRating.toFixed(1)}</span>
                                {c.yelpReviewCount && <span className="text-gray-400">({c.yelpReviewCount.toLocaleString()} reviews)</span>}
                              </span>
                            ) : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">BBB Rating</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.bbbRating ? (
                              <span className="flex items-center gap-2">
                                <span className="font-semibold">{c.bbbRating}</span>
                                {c.bbbAccredited && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                    <CheckCircle className="w-3 h-3" /> Accredited
                                  </span>
                                )}
                              </span>
                            ) : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">BBB Complaints (3yr)</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.bbbComplaints != null ? (
                              <span className={c.bbbComplaints > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                {c.bbbComplaints === 0 ? 'None' : `${c.bbbComplaints} complaint${c.bbbComplaints !== 1 ? 's' : ''}`}
                              </span>
                            ) : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Bonded</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.bonded ? (
                              <span className="inline-flex items-center gap-1 text-switch-green-700">
                                <CheckCircle className="w-4 h-4" /> Yes
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Contact Name</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.contactName || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Address</td>
                        {contractorData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.address || '-'}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </>
            )}

            {activeTab === 'costs' && (
              <>
                <thead>
                  <tr className="bg-gray-900">
                    <th style={labelCellStyle} className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                      Cost Item
                    </th>
                    {costData.map((c, idx) => (
                      <th key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < costData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                        {c.contractor}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <td style={labelCellStyle} className="px-5 py-5 text-sm font-bold text-gray-900 bg-gray-100 border-r border-gray-200">Total Bid Amount</td>
                    {costData.map((c, idx) => (
                      <td
                        key={c.bidId}
                        style={bidCellStyle}
                        className={`px-5 py-5 ${isHighlighted(c.totalAmount, lowestPrice) ? 'bg-gradient-to-r from-switch-green-50 to-switch-green-100' : ''} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`text-xl font-bold ${isHighlighted(c.totalAmount, lowestPrice) ? 'text-switch-green-700' : 'text-gray-900'}`}>
                            {formatCurrency(c.totalAmount)}
                          </span>
                          {isHighlighted(c.totalAmount, lowestPrice) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" /> LOWEST
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Equipment Cost</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {formatCurrency(c.equipmentCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Labor Cost</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {formatCurrency(c.laborCost)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Labor Warranty</td>
                    {costData.map((c, idx) => (
                      <td
                        key={c.bidId}
                        style={bidCellStyle}
                        className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.laborWarranty, bestLaborWarranty) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          {c.laborWarranty ? `${c.laborWarranty} years` : '-'}
                          {isHighlighted(c.laborWarranty, bestLaborWarranty) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" /> BEST
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Equipment Warranty</td>
                    {costData.map((c, idx) => (
                      <td
                        key={c.bidId}
                        style={bidCellStyle}
                        className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.equipmentWarranty, bestEquipmentWarranty) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          {c.equipmentWarranty ? `${c.equipmentWarranty} years` : '-'}
                          {isHighlighted(c.equipmentWarranty, bestEquipmentWarranty) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" /> BEST
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Estimated Duration</td>
                    {costData.map((c, idx) => (
                      <td
                        key={c.bidId}
                        style={bidCellStyle}
                        className={`px-5 py-4 text-sm ${isHighlighted(c.estimatedDays, fastestTimeline) ? 'text-switch-green-700 font-semibold' : 'text-gray-600'} ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}
                      >
                        {c.estimatedDays ? `${c.estimatedDays} days` : '-'}
                        {isHighlighted(c.estimatedDays, fastestTimeline) && c.estimatedDays && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                            FASTEST
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Financing Available</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.financingAvailable ? (
                          <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                            <CheckCircle className="w-5 h-5" /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <XCircle className="w-5 h-5" /> No
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className={showFinancingDetails ? 'border-b border-gray-200 bg-gray-50/50' : ''}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">What is NOT Included</td>
                    {costData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-900 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.exclusions.length > 0 ? (
                          <ul className="text-xs space-y-1.5">
                            {c.exclusions.slice(0, 4).map((item, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{item}</span>
                              </li>
                            ))}
                            {c.exclusions.length > 4 && (
                              <li className="text-gray-500 pl-5">+{c.exclusions.length - 4} more items</li>
                            )}
                          </ul>
                        ) : (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {showFinancingDetails && (
                    <>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Available Start Date</td>
                        {costData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {formatDateDisplay(c.startDateAvailable)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Quote Valid Until</td>
                        {costData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {formatDateDisplay(c.validUntil)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Bid Date</td>
                        {costData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {formatDateDisplay(c.bidDate)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Materials Cost</td>
                        {costData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {formatCurrency(c.materialsCost)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Permit Cost</td>
                        {costData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {formatCurrency(c.permitCost)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Deposit Required</td>
                        {costData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.depositRequired ? formatCurrency(c.depositRequired) : c.depositPercentage ? `${c.depositPercentage}%` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Payment Schedule</td>
                        {costData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.paymentSchedule || '-'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Financing Terms</td>
                        {costData.map((c, idx) => (
                          <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < costData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                            {c.financingTerms || '-'}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>

        {(activeTab === 'equipment' || activeTab === 'contractors' || activeTab === 'costs') && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => {
                if (activeTab === 'equipment') setShowMoreEquipment(!showMoreEquipment);
                if (activeTab === 'contractors') setShowMoreContractors(!showMoreContractors);
                if (activeTab === 'costs') setShowFinancingDetails(!showFinancingDetails);
              }}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {(activeTab === 'equipment' && showMoreEquipment) ||
               (activeTab === 'contractors' && showMoreContractors) ||
               (activeTab === 'costs' && showFinancingDetails) ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {activeTab === 'costs' ? 'Show Financial Terms & Details' : 'Show More Details'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'costs' && (
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b-2 border-gray-200 bg-gradient-to-r from-gray-700 to-gray-800">
            <h2 className="font-semibold text-white">Scope - What's Included</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-gray-900">
                  <th style={labelCellStyle} className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                    Scope Item
                  </th>
                  {scopeData.map((s, idx) => (
                    <th key={s.bidId} style={bidCellStyle} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < scopeData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                      {s.contractor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scopeItems.map((item, rowIdx) => (
                  <tr key={item.key} className={`border-b border-gray-200 ${rowIdx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
                      {item.label}
                    </td>
                    {scopeData.map((s, idx) => {
                      const value = s[item.key as keyof typeof s];
                      const detail = s[item.detailKey as keyof typeof s];
                      return (
                        <td key={s.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < scopeData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                          {value === true ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-switch-green-700 font-medium">
                                <CheckCircle className="w-5 h-5" /> Included
                              </span>
                              {detail && typeof detail === 'string' && (
                                <p className="text-xs text-gray-600 mt-1">{detail}</p>
                              )}
                            </div>
                          ) : value === false ? (
                            <span className="inline-flex items-center gap-1 text-red-500">
                              <XCircle className="w-5 h-5" /> Not Included
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400" title="Not specified in bid">
                              <HelpCircle className="w-5 h-5" /> Unknown
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Export Your Analysis</h2>
        <p className="text-sm text-gray-600 mb-4">
          Download or email a comprehensive report with all your bid comparisons.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="btn btn-secondary flex items-center gap-2"
          >
            {downloadingReport ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Report
              </>
            )}
          </button>

          <button
            onClick={handleEmailReport}
            disabled={emailingReport}
            className="btn btn-secondary flex items-center gap-2"
          >
            {emailingReport ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : reportSent ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Sent to {user?.email}
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Email Report
              </>
            )}
          </button>
        </div>

        {reportSent && (
          <p className="text-sm text-switch-green-600 mt-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Report sent successfully! Check your email.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="btn btn-primary flex items-center gap-2 px-6"
        >
          Continue to Decide
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
