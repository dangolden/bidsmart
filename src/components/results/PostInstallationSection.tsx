import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ClipboardCheck, Download, FileCheck2, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getBidWithChildren } from '../../lib/database/bidsmartService';
import { ContractorReviewSurvey } from '../ContractorReviewSurvey';
import type { BidWithChildren } from '../../lib/types';

interface PostInstallationSectionProps {
  projectId: string;
}

export function PostInstallationSection({ projectId }: PostInstallationSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedBid, setSelectedBid] = useState<BidWithChildren | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load data only when section is first opened
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadProjectData();
    }
  }, [isOpen, hasLoaded]);

  async function loadProjectData() {
    setLoading(true);
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, selected_bid_id')
      .eq('id', projectId)
      .single();

    if (projectData?.selected_bid_id) {
      try {
        const bidWithChildren = await getBidWithChildren(projectData.selected_bid_id);
        setSelectedBid(bidWithChildren);
      } catch (error) {
        console.error('Error loading selected bid:', error);
      }
    }

    setLoading(false);
    setHasLoaded(true);
  }

  function handleDownloadChecklist() {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contractor-checklist?project_id=${projectId}`;
    window.open(url, '_blank');
  }

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
        <div className="border-t border-gray-200 p-5 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-switch-green-600 mx-auto mb-4" />
              Loading...
            </div>
          ) : (
            <>
              {/* Quality Installation Checklist */}
              <div className="bg-gradient-to-r from-blue-50 to-switch-green-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-lg">
                    <ClipboardCheck className="w-8 h-8 text-switch-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5" />
                      Quality Installation Checklist
                    </h3>
                    <p className="text-gray-700 mb-4">
                      Before your installation began, you should have provided the contractor with a quality
                      installation checklist. This ensures industry-standard practices are followed.
                    </p>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Download the Checklist</p>
                          <p className="text-sm text-gray-600">
                            If you haven't already, you can still download it for your records
                          </p>
                        </div>
                        <button
                          onClick={handleDownloadChecklist}
                          className="btn btn-secondary flex items-center gap-2 ml-4"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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

                {selectedBid ? (
                  <ContractorReviewSurvey
                    projectId={projectId}
                    contractorBidId={selectedBid.bid.id}
                    onSubmitSuccess={() => {
                      loadProjectData();
                    }}
                  />
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <p className="text-amber-800">
                      Select a contractor first, then return here to leave a review after installation.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
