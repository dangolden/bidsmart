import { useState } from 'react';
import {
  FileText, Star, StarOff, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Phone, Mail, Globe, Award
} from 'lucide-react';
import * as db from '../lib/database/bidsmartService';
import type { ContractorBid, PdfUpload } from '../lib/types';
import { formatCurrency } from '../lib/utils/formatters';

interface BidCardProps {
  bid: ContractorBid;
  pdfUpload?: PdfUpload;
  onUpdate: () => void;
}

export function BidCard({ bid, pdfUpload: _pdfUpload, onUpdate }: BidCardProps) {
  const [expanded, setExpanded] = useState(false);

  async function toggleFavorite() {
    await db.toggleBidFavorite(bid.id);
    onUpdate();
  }

  function getConfidenceBadge() {
    if (bid.verified_by_user) {
      return <span className="status-badge status-complete"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</span>;
    }
    
    const confidenceConfig = {
      high: { label: 'High Confidence', className: 'status-complete' },
      medium: { label: 'Medium Confidence', className: 'status-review' },
      low: { label: 'Low Confidence', className: 'status-error' },
      manual: { label: 'Manual Entry', className: 'bg-gray-100 text-gray-700' },
    };
    
    const config = confidenceConfig[bid.extraction_confidence];
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  }

  return (
    <div className={`card ${bid.is_favorite ? 'border-switch-green-300 bg-switch-green-50/30' : ''}`}>
      {/* Header */}
      <div className="p-4 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">{bid.contractor_name}</h3>
              {bid.contractor_is_switch_preferred && (
                <span className="status-badge bg-switch-green-100 text-switch-green-800 flex-shrink-0">
                  <Award className="w-3 h-3 mr-1" />
                  Preferred
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
              {bid.contractor_phone && (
                <a href={`tel:${bid.contractor_phone}`} className="flex items-center gap-1 hover:text-switch-green-600 min-h-[44px] sm:min-h-0 py-2 sm:py-0">
                  <Phone className="w-3 h-3" />
                  <span className="hidden sm:inline">{bid.contractor_phone}</span>
                  <span className="sm:hidden">Call</span>
                </a>
              )}
              {bid.contractor_email && (
                <a href={`mailto:${bid.contractor_email}`} className="flex items-center gap-1 hover:text-switch-green-600 min-h-[44px] sm:min-h-0 py-2 sm:py-0">
                  <Mail className="w-3 h-3" />
                  Email
                </a>
              )}
              {bid.contractor_website && (
                <a href={bid.contractor_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-switch-green-600 min-h-[44px] sm:min-h-0 py-2 sm:py-0">
                  <Globe className="w-3 h-3" />
                  Website
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {getConfidenceBadge()}
              {bid.extraction_confidence === 'low' && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Review recommended
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-left sm:text-right">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatCurrency(bid.total_bid_amount)}
            </p>
            {bid.total_after_rebates && bid.total_after_rebates !== bid.total_bid_amount && (
              <p className="text-sm text-switch-green-600 whitespace-nowrap">
                {formatCurrency(bid.total_after_rebates)} after rebates
              </p>
            )}
          </div>
          <button
            onClick={toggleFavorite}
            className={`p-3 sm:p-2 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center ${
              bid.is_favorite
                ? 'bg-yellow-100 text-yellow-600'
                : 'hover:bg-gray-100 text-gray-400'
            }`}
            title={bid.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={bid.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {bid.is_favorite ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Warranty</p>
          <p className="font-medium text-gray-900">
            {bid.labor_warranty_years || bid.equipment_warranty_years ? (
              <>
                {bid.labor_warranty_years && `${bid.labor_warranty_years}yr labor`}
                {bid.labor_warranty_years && bid.equipment_warranty_years && ' / '}
                {bid.equipment_warranty_years && `${bid.equipment_warranty_years}yr equip`}
              </>
            ) : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Timeline</p>
          <p className="font-medium text-gray-900">
            {bid.estimated_days ? `${bid.estimated_days} days` : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Years in Business</p>
          <p className="font-medium text-gray-900">
            {bid.contractor_years_in_business ? `${bid.contractor_years_in_business} years` : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Score</p>
          <p className="font-medium text-gray-900">
            {bid.overall_score ? (
              <span className={`score-badge ${
                bid.overall_score >= 80 ? 'score-high' : 
                bid.overall_score >= 60 ? 'score-medium' : 'score-low'
              }`}>
                {bid.overall_score.toFixed(0)}/100
              </span>
            ) : '—'}
          </p>
        </div>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 border-t border-gray-100 flex items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show details
          </>
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {/* Contractor Credentials */}
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">License</p>
              <p className="font-medium text-gray-900">
                {bid.contractor_license ? (
                  <>
                    {bid.contractor_license}
                    {bid.contractor_license_state && ` (${bid.contractor_license_state})`}
                  </>
                ) : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Google Rating</p>
              <p className="font-medium text-gray-900">
                {bid.contractor_google_rating ? (
                  <>
                    {bid.contractor_google_rating.toFixed(1)} ⭐
                    {bid.contractor_google_review_count && ` (${bid.contractor_google_review_count} reviews)`}
                  </>
                ) : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Certifications</p>
              <p className="font-medium text-gray-900">
                {bid.contractor_certifications && bid.contractor_certifications.length > 0
                  ? bid.contractor_certifications.join(', ')
                  : '—'}
              </p>
            </div>
          </div>

          {/* Scope */}
          {bid.scope_summary && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Scope of Work</h4>
              <p className="text-sm text-gray-600">{bid.scope_summary}</p>
            </div>
          )}

          {/* Inclusions/Exclusions */}
          <div className="grid md:grid-cols-2 gap-4">
            {bid.inclusions && bid.inclusions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Included</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {bid.inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {bid.exclusions && bid.exclusions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Not Included</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {bid.exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Payment Terms */}
          {(bid.deposit_required || bid.financing_offered) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Payment</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {bid.deposit_required && (
                  <p>Deposit: {formatCurrency(bid.deposit_required)} {bid.deposit_percentage && `(${bid.deposit_percentage}%)`}</p>
                )}
                {bid.financing_offered && (
                  <p className="text-switch-green-600">✓ Financing available {bid.financing_terms && `- ${bid.financing_terms}`}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {bid.extraction_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-amber-800 mb-1">Extraction Notes</h4>
              <p className="text-sm text-amber-700">{bid.extraction_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
