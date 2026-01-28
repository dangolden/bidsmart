import { useState, useEffect } from 'react';
import { ClipboardCheck, Download, FileCheck2, MessageSquare } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';
import { supabase } from '../../lib/supabaseClient';
import { ContractorReviewSurvey } from '../ContractorReviewSurvey';

export function VerifyPhase() {
  const { projectId } = usePhase();
  const [loading, setLoading] = useState(true);
  const [contractorBid, setContractorBid] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  async function loadProjectData() {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*, users_ext(*)')
      .eq('id', projectId)
      .single();

    if (projectData?.selected_bid_id) {
      const { data: bidData } = await supabase
        .from('contractor_bids')
        .select('*')
        .eq('id', projectData.selected_bid_id)
        .single();

      setContractorBid(bidData);
    }

    setLoading(false);
  }

  function handleDownloadChecklist() {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contractor-checklist?project_id=${projectId}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-switch-green-600 mx-auto mb-4" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Installation Complete & Review</h1>
        <p className="text-gray-600 mt-1">
          Help other homeowners by sharing your experience with this contractor.
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-switch-green-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg">
            <ClipboardCheck className="w-8 h-8 text-switch-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5" />
              Quality Installation Checklist
            </h2>
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

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-switch-green-50 rounded-lg">
            <MessageSquare className="w-8 h-8 text-switch-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Share Your Experience
            </h2>
            <p className="text-gray-600">
              Your feedback helps build a trusted community and improves contractor quality standards.
              This survey takes about 5 minutes to complete.
            </p>
          </div>
        </div>

        {contractorBid ? (
          <ContractorReviewSurvey
            projectId={projectId!}
            contractorBidId={contractorBid.id}
            onSubmitSuccess={() => {
              loadProjectData();
            }}
          />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-amber-800">
              Please select a contractor in the previous phase before completing this review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
