import { useState } from 'react';
import {
  FileText, Star, StarOff, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Phone, Mail, Globe
} from 'lucide-react';
import * as db from '../lib/database/bidsmartService';
import type { ContractorBid, BidScope, BidContractor, BidScore, PdfUpload } from '../lib/types';
import { formatCurrency } from '../lib/utils/formatters';

interface BidCardProps {
  bid: ContractorBid;
  scope?: BidScope | null;
  contractor?: BidContractor | null;
  scores?: BidScore | null;
  pdfUpload?: PdfUpload;
  onUpdate: () => void;
}

export function BidCard({ bid, scope, contractor, scores, pdfUpload: _pdfUpload, onUpdate }: BidCardProps) {
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
    
    const confidence = scope?.extraction_confidence || 'manual';
    const config = confidenceConfig[confidence];
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
              {/* Switch preferred badge — requires Switch.com integration */}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
              {contractor?.phone && (
                <a href={`tel:${contractor.phone}`} className="flex items-center gap-1 hover:text-switch-green-600 min-h-[44px] sm:min-h-0 py-2 sm:py-0">
                  <Phone className="w-3 h-3" />
                  <span className="hidden sm:inline">{contractor.phone}</span>
                  <span className="sm:hidden">Call</span>
                </a>
              )}
              {contractor?.email && (
                <a href={`mailto:${contractor.email}`} className="flex items-center gap-1 hover:text-switch-green-600 min-h-[44px] sm:min-h-0 py-2 sm:py-0">
                  <Mail className="w-3 h-3" />
                  Email
                </a>
              )}
              {contractor?.website && (
                <a href={contractor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-switch-green-600 min-h-[44px] sm:min-h-0 py-2 sm:py-0">
                  <Globe className="w-3 h-3" />
                  Website
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {getConfidenceBadge()}
              {(scope?.extraction_confidence || 'manual') === 'low' && (
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
              {formatCurrency(scope?.total_bid_amount ?? 0)}
            </p>
            {scope?.total_after_rebates && scope.total_after_rebates !== scope.total_bid_amount && (
              <p className="text-sm text-switch-green-600 whitespace-nowrap">
                {formatCurrency(scope.total_after_rebates)} after rebates
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
            {scope?.labor_warranty_years || scope?.equipment_warranty_years ? (
              <>
                {scope?.labor_warranty_years && `${scope.labor_warranty_years}yr labor`}
                {scope?.labor_warranty_years && scope?.equipment_warranty_years && ' / '}
                {scope?.equipment_warranty_years && `${scope.equipment_warranty_years}yr equip`}
              </>
            ) : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Timeline</p>
          <p className="font-medium text-gray-900">
            {scope?.estimated_days ? `${scope.estimated_days} days` : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Years in Business</p>
          <p className="font-medium text-gray-900">
            {contractor?.years_in_business ? `${contractor.years_in_business} years` : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Score</p>
          <p className="font-medium text-gray-900">
            {scores?.overall_score ? (
              <span className={`score-badge ${
                scores.overall_score >= 80 ? 'score-high' :
                scores.overall_score >= 60 ? 'score-medium' : 'score-low'
              }`}>
                {scores.overall_score.toFixed(0)}/100
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
                {contractor?.license ? (
                  <>
                    {contractor.license}
                    {contractor.license_state && ` (${contractor.license_state})`}
                  </>
                ) : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Google Rating</p>
              <p className="font-medium text-gray-900">
                {contractor?.google_rating ? (
                  <>
                    {contractor.google_rating.toFixed(1)} ⭐
                    {contractor.google_review_count && ` (${contractor.google_review_count} reviews)`}
                  </>
                ) : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Certifications</p>
              <p className="font-medium text-gray-900">
                {contractor?.certifications && contractor.certifications.length > 0
                  ? contractor.certifications.join(', ')
                  : '—'}
              </p>
            </div>
          </div>

          {/* Scope */}
          {scope?.summary && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Scope of Work</h4>
              <p className="text-sm text-gray-600">{scope.summary}</p>
            </div>
          )}

          {/* Inclusions/Exclusions */}
          <div className="grid md:grid-cols-2 gap-4">
            {scope?.inclusions && scope.inclusions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Included</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {scope.inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {scope?.exclusions && scope.exclusions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Not Included</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {scope.exclusions.map((item, i) => (
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
          {(scope?.deposit_required || scope?.financing_offered) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Payment</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {scope?.deposit_required && (
                  <p>Deposit: {formatCurrency(scope.deposit_required)} {scope?.deposit_percentage && `(${scope.deposit_percentage}%)`}</p>
                )}
                {scope?.financing_offered && (
                  <p className="text-switch-green-600">✓ Financing available {scope?.financing_terms && `- ${scope.financing_terms}`}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {scope?.extraction_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-amber-800 mb-1">Extraction Notes</h4>
              <p className="text-sm text-amber-700">{scope.extraction_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
