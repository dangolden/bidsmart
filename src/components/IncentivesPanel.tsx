import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  MapPin,
  Search,
  Loader2,
  Clock,
  Shield,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type { IncentiveProgramDB } from '../lib/types';
import { getIncentivesByZip } from '../lib/database/bidsmartService';
import { formatCurrency, formatDate } from '../lib/utils/formatters';
import { zipToState } from '../lib/utils/zipToState';

interface IncentivesPanelProps {
  userZip: string | null;
  userState: string | null;
}

function getDisplayAmount(incentive: IncentiveProgramDB): string {
  if (incentive.rebate_percentage && incentive.max_rebate) {
    return `${incentive.rebate_percentage}% (up to ${formatCurrency(incentive.max_rebate)})`;
  }
  if (incentive.rebate_amount && incentive.max_rebate && incentive.rebate_amount !== incentive.max_rebate) {
    return `${formatCurrency(incentive.rebate_amount)} – ${formatCurrency(incentive.max_rebate)}`;
  }
  if (incentive.max_rebate) {
    return `Up to ${formatCurrency(incentive.max_rebate)}`;
  }
  if (incentive.rebate_amount) {
    return formatCurrency(incentive.rebate_amount);
  }
  if (incentive.rebate_percentage) {
    return `${incentive.rebate_percentage}%`;
  }
  return 'Amount varies';
}

function getStatusBadge(incentive: IncentiveProgramDB): { label: string; className: string } | null {
  if (!incentive.is_active) {
    return { label: 'Inactive', className: 'bg-red-100 text-red-700' };
  }
  if (incentive.valid_until) {
    const until = new Date(incentive.valid_until);
    const now = new Date();
    const daysLeft = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      return { label: 'Expired', className: 'bg-red-100 text-red-700' };
    }
    if (daysLeft <= 90) {
      return { label: 'Ending Soon', className: 'bg-amber-100 text-amber-700' };
    }
  }
  return null;
}

function formatRequirements(requirements: Record<string, any>): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  if (requirements.min_seer2) items.push({ label: 'Min SEER2', value: String(requirements.min_seer2) });
  if (requirements.min_hspf2) items.push({ label: 'Min HSPF2', value: String(requirements.min_hspf2) });
  if (requirements.energy_star_required) items.push({ label: 'ENERGY STAR', value: 'Required' });
  if (requirements.energy_star_most_efficient) items.push({ label: 'ENERGY STAR Most Efficient', value: 'Required' });
  if (requirements.equipment_types) {
    items.push({ label: 'Equipment', value: (requirements.equipment_types as string[]).join(', ').replace(/_/g, ' ') });
  }
  if (requirements.income_qualified) items.push({ label: 'Income Qualified', value: 'Yes' });
  if (requirements.income_threshold_pct_ami) items.push({ label: 'Income Threshold', value: `≤ ${requirements.income_threshold_pct_ami}% AMI` });
  // Show any remaining keys we didn't explicitly handle
  for (const [key, val] of Object.entries(requirements)) {
    if (!['min_seer2', 'min_hspf2', 'energy_star_required', 'energy_star_most_efficient', 'equipment_types', 'income_qualified', 'income_threshold_pct_ami'].includes(key)) {
      items.push({ label: key.replace(/_/g, ' '), value: String(val) });
    }
  }
  return items;
}

export function IncentivesPanel({ userZip, userState }: IncentivesPanelProps) {
  const [zipInput, setZipInput] = useState(userZip || '');
  const [activeZip, setActiveZip] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!userZip);
  const [incentives, setIncentives] = useState<IncentiveProgramDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Simple session cache
  const [cache] = useState<Map<string, IncentiveProgramDB[]>>(() => new Map());

  const loadIncentives = useCallback(async (zip: string, state?: string) => {
    const cacheKey = `${zip}_${state || ''}`;
    if (cache.has(cacheKey)) {
      setIncentives(cache.get(cacheKey)!);
      setActiveZip(zip);
      setIsEditing(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await getIncentivesByZip(zip, state);
      setIncentives(results);
      setActiveZip(zip);
      setIsEditing(false);
      cache.set(cacheKey, results);
    } catch (err) {
      console.error('Error loading incentives:', err);
      setError('Failed to load incentives. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [cache]);

  // Auto-load if user has a valid zip
  useEffect(() => {
    if (userZip && /^\d{5}$/.test(userZip)) {
      const state = userState || zipToState(userZip) || undefined;
      loadIncentives(userZip, state);
    }
  }, [userZip, userState, loadIncentives]);

  const handleSubmitZip = () => {
    if (!/^\d{5}$/.test(zipInput)) {
      setZipError('Enter a valid 5-digit US zip code');
      return;
    }
    setZipError(null);
    const state = userState || zipToState(zipInput) || undefined;
    loadIncentives(zipInput, state);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitZip();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // --- Zip input bar ---
  const renderZipBar = () => (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-gray-500" />
        </div>
        {isEditing || !activeZip ? (
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 mb-2">Enter your zip code to find available incentives</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={zipInput}
                onChange={(e) => {
                  setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5));
                  setZipError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 90210"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
                maxLength={5}
              />
              <button
                onClick={handleSubmitZip}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2 text-sm px-4 py-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
            {zipError && (
              <p className="text-xs text-red-600 mt-1">{zipError}</p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Showing incentives for</p>
              <p className="font-semibold text-gray-900">{activeZip}</p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-switch-green-600 hover:text-switch-green-700 font-medium"
            >
              Change
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // --- Loading ---
  if (loading) {
    return (
      <div className="space-y-4">
        {renderZipBar()}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-switch-green-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading incentives...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div className="space-y-4">
        {renderZipBar()}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-700 mb-3">{error}</p>
          <button
            onClick={() => activeZip && loadIncentives(activeZip, userState || zipToState(activeZip) || undefined)}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // --- No zip entered yet ---
  if (!activeZip) {
    return (
      <div className="space-y-4">
        {renderZipBar()}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Available Incentives</h3>
          <p className="text-gray-600">Enter your zip code above to see federal, state, and utility incentives for heat pump installations in your area.</p>
        </div>
      </div>
    );
  }

  // --- Empty results ---
  if (incentives.length === 0) {
    return (
      <div className="space-y-4">
        {renderZipBar()}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Incentives Found</h3>
          <p className="text-gray-600">
            No incentive programs were found for zip code {activeZip}. Check with your local utility company or visit{' '}
            <a href="https://www.dsireusa.org/" target="_blank" rel="noopener noreferrer" className="text-switch-green-600 hover:text-switch-green-700 font-medium">
              DSIRE
            </a>{' '}
            for a comprehensive database.
          </p>
        </div>
      </div>
    );
  }

  // --- Results ---
  return (
    <div className="space-y-4">
      {renderZipBar()}

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-switch-green-600 to-switch-green-700 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Available Rebates & Incentives</h3>
              <p className="text-switch-green-100 text-sm">
                {incentives.length} program{incentives.length !== 1 ? 's' : ''} found for your area
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {incentives.map((incentive) => {
            const isExpanded = expandedRows.has(incentive.id);
            const statusBadge = getStatusBadge(incentive);

            return (
              <div key={incentive.id}>
                <button
                  onClick={() => toggleExpand(incentive.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="p-1">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{incentive.program_name}</h4>
                      {(incentive.program_type_display || incentive.program_type) && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                          {(incentive.program_type_display || incentive.program_type || '').replace(/_/g, ' ')}
                        </span>
                      )}
                      {incentive.income_qualified && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          Income Qualified
                        </span>
                      )}
                      {statusBadge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      )}
                      {incentive.stackable && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                          Stackable
                        </span>
                      )}
                    </div>
                    {!isExpanded && incentive.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{incentive.description}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-bold text-switch-green-700">
                      {getDisplayAmount(incentive)}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pl-14 space-y-4">
                    {incentive.description && (
                      <div>
                        <p className="text-sm text-gray-700">{incentive.description}</p>
                      </div>
                    )}

                    {/* Requirements */}
                    {incentive.requirements && Object.keys(incentive.requirements).length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Equipment Requirements</span>
                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                          {formatRequirements(incentive.requirements).map((req, i) => (
                            <div key={i} className="text-sm">
                              <span className="text-gray-500">{req.label}:</span>{' '}
                              <span className="text-gray-900 font-medium capitalize">{req.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Income Limits */}
                    {incentive.income_qualified && incentive.income_limits && (
                      <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-amber-800 uppercase">Income Limits</span>
                          <div className="text-sm text-amber-900 mt-1">
                            {typeof incentive.income_limits === 'object' ? (
                              Object.entries(incentive.income_limits).map(([key, val]) => (
                                <div key={key}>
                                  <span className="capitalize">{key.replace(/_/g, ' ')}:</span> {String(val)}
                                </div>
                              ))
                            ) : (
                              String(incentive.income_limits)
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Validity Dates */}
                    {(incentive.valid_from || incentive.valid_until) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {incentive.valid_from && <span>From {formatDate(incentive.valid_from)}</span>}
                        {incentive.valid_from && incentive.valid_until && <span>·</span>}
                        {incentive.valid_until && <span>Until {formatDate(incentive.valid_until)}</span>}
                      </div>
                    )}

                    {/* How to Apply */}
                    {incentive.application_process && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase">How to Apply</span>
                        <p className="text-sm text-gray-700 mt-1">{incentive.application_process}</p>
                      </div>
                    )}

                    {/* Stacking Info */}
                    {incentive.stackable === false && (
                      <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                        <span className="font-medium">Not Stackable:</span> This incentive cannot be combined with other programs.
                      </div>
                    )}
                    {incentive.cannot_stack_with && incentive.cannot_stack_with.length > 0 && (
                      <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                        <span className="font-medium">Stacking Restriction:</span> Cannot combine with {incentive.cannot_stack_with.join(', ')}
                      </div>
                    )}

                    {/* Processing Time */}
                    {incentive.typical_processing_days && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        Typical processing: {incentive.typical_processing_days} days
                      </div>
                    )}

                    {/* Last Verified */}
                    {incentive.last_verified && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        Last verified: {formatDate(incentive.last_verified)}
                      </div>
                    )}

                    {/* Links */}
                    <div className="flex items-center gap-4">
                      {incentive.application_url && (
                        <a
                          href={incentive.application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-switch-green-600 hover:text-switch-green-700 font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Application Details
                        </a>
                      )}
                      {incentive.discovery_source_url && (
                        <a
                          href={incentive.discovery_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="bg-gray-50 px-5 py-4 border-t-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {incentives.length} incentive program{incentives.length !== 1 ? 's' : ''} available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
