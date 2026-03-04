import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ClipboardCheck, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getBidsByProject, getBidWithChildren } from '../../lib/database/bidsmartService';
import { getContractorDisplayName } from '../../lib/utils/bidDeduplication';
import { ContractorReviewSurvey } from '../ContractorReviewSurvey';
import { QIIChecklist } from '../QIIChecklist';
import type { BidWithChildren } from '../../lib/types';

interface PostInstallationSectionProps {
  projectId: string;
  alwaysOpen?: boolean;
}

export function PostInstallationSection({ projectId, alwaysOpen = false }: PostInstallationSectionProps) {
  const [isOpen, setIsOpen] = useState(alwaysOpen);
  const [loading, setLoading] = useState(false);
  const [allBids, setAllBids] = useState<BidWithChildren[]>([]);
  const [selectedContractorBidId, setSelectedContractorBidId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load data immediately when alwaysOpen, or when section is first opened
  useEffect(() => {
    if ((isOpen || alwaysOpen) && !hasLoaded) {
      loadProjectData();
    }
  }, [isOpen, hasLoaded, alwaysOpen]);

  async function loadProjectData() {
    setLoading(true);

    try {
      // Load all bids for the project
      const bids = await getBidsByProject(projectId);

      // Load children (contractor info) for each bid
      const bidsWithChildren = await Promise.all(
        bids.map(async (bid) => {
          try {
            return await getBidWithChildren(bid.id);
          } catch {
            return null;
          }
        })
      );

      const validBids = bidsWithChildren.filter((b): b is BidWithChildren => b !== null);
      setAllBids(validBids);

      // Pre-select if project has a selected_bid_id
      const { data: projectData } = await supabase
        .from('projects')
        .select('selected_bid_id')
        .eq('id', projectId)
        .single();

      if (projectData?.selected_bid_id) {
        setSelectedContractorBidId(projectData.selected_bid_id);
      }
    } catch (error) {
      console.error('Error loading project bids:', error);
    }

    setLoading(false);
    setHasLoaded(true);
  }

  const selectedBidForReview = allBids.find(b => b.bid.id === selectedContractorBidId) || null;

  const content = (
    <div className="space-y-6">
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-switch-green-600 mx-auto mb-4" />
          Loading...
        </div>
      ) : (
        <>
          {/* Heat Pump Installation Checklist — interactive with real checkboxes */}
          <QIIChecklist projectId={projectId} defaultExpanded={true} />

          {/* Contractor Review Survey */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-switch-green-50 rounded-lg">
                <MessageSquare className="w-8 h-8 text-switch-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Share Your Experience
                </h3>
                <p className="text-gray-600">
                  Your feedback helps build a trusted community and improves contractor quality standards.
                  This survey takes about 5 minutes to complete.
                </p>
              </div>
            </div>

            {/* Contractor Selector */}
            {allBids.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Which contractor are you reviewing?
                  </label>
                  <select
                    value={selectedContractorBidId || ''}
                    onChange={(e) => setSelectedContractorBidId(e.target.value || null)}
                    className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-switch-green-500 focus:border-switch-green-500"
                  >
                    <option value="">Select a contractor...</option>
                    {allBids.map((b, idx) => (
                      <option key={b.bid.id} value={b.bid.id}>
                        {getContractorDisplayName(b.bid.contractor_name, idx, b.contractor)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBidForReview ? (
                  <ContractorReviewSurvey
                    key={selectedBidForReview.bid.id}
                    projectId={projectId}
                    contractorBidId={selectedBidForReview.bid.id}
                    onSubmitSuccess={() => {
                      loadProjectData();
                    }}
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-sm">
                      Select a contractor above to leave your review.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-500">
                  No contractors found for this project.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // When rendered as a tab, show content directly without collapsible wrapper
  if (alwaysOpen) {
    return content;
  }

  // Collapsible version (legacy fallback)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-gray-400" />
          <span className="font-semibold text-gray-700">Post-Installation</span>
          <span className="text-xs text-gray-400 font-normal">Quality checklist & contractor review</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 p-5">
          {content}
        </div>
      )}
    </div>
  );
}
