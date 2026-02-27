import { useState } from 'react';
import { Home, Download, Mail, Loader2, CheckCircle } from 'lucide-react';
import { ProjectProvider, useProject } from '../../context/ProjectContext';
import { useUser } from '../../hooks/useUser';
import { AlphaBanner } from '../AlphaBanner';
import { DemoBanner } from '../DemoBanner';
import { AnalysisStatusBanner } from './AnalysisStatusBanner';
import { ResultsTabBar } from './ResultsTabBar';
import { IncentivesTab } from './IncentivesTab';
import { EquipmentTab } from './EquipmentTab';
import { ContractorsTab } from './ContractorsTab';
import { CostScopeTab } from './CostScopeTab';
import { QuestionsTab } from './QuestionsTab';
import { PostInstallationSection } from './PostInstallationSection';
import type { UserExt } from '../../lib/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface ResultsViewProps {
  user: UserExt;
  projectId: string;
  onNavigateHome?: () => void;
}

export function ResultsView({ user, projectId, onNavigateHome }: ResultsViewProps) {
  return (
    <ProjectProvider userId={user.id} projectId={projectId}>
      <AlphaBanner />
      <ResultsViewContent onNavigateHome={onNavigateHome} />
    </ProjectProvider>
  );
}

function ResultsViewContent({ onNavigateHome }: { onNavigateHome?: () => void }) {
  const {
    project,
    bids,
    questions,
    loading,
    error,
    isDemoMode,
    activeTab,
    setActiveTab,
    analysisStatus,
    analyzedBidCount,
    totalBidCount,
    refreshQuestions,
    projectId,
  } = useProject();
  const { user } = useUser();
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [emailingReport, setEmailingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-switch-green-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-600">!</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Results</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          {onNavigateHome && (
            <button onClick={onNavigateHome} className="btn btn-primary">
              Return Home
            </button>
          )}
        </div>
      </div>
    );
  }

  // Data-availability checks for tab waiting indicators
  const hasEquipmentData = bids.some(b => b.equipment.length > 0);
  const hasContractorData = bids.some(b => !!b.contractor);
  const hasCostData = bids.some(b => !!b.scope);
  const hasQuestionData = questions.length > 0;

  // Bids from ProjectContext already match BidEntry shape (ContractorBid = Bid)
  const bidEntries = bids;

  // IncentivesTab needs bid scores
  const bidScores = bids.map(b => ({
    bidId: b.bid.id,
    contractorName: b.bid.contractor_name,
    scores: b.scores,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <img
                src="/switchlogo.svg"
                alt="Switch Logo"
                className="h-8 w-auto"
              />
            </button>
          )}
          {project?.project_name && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-medium text-gray-700 truncate">
                {project.project_name}
              </span>
            </>
          )}
          {isDemoMode && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Demo
            </span>
          )}
          <div className="flex-1" />
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {isDemoMode && <DemoBanner onStartOwn={onNavigateHome} />}

        <AnalysisStatusBanner
          status={analysisStatus}
          analyzedBidCount={analyzedBidCount}
          totalBidCount={totalBidCount}
        />

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ResultsTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            analysisStatus={analysisStatus}
            hasEquipmentData={hasEquipmentData}
            hasContractorData={hasContractorData}
            hasCostData={hasCostData}
            hasQuestionData={hasQuestionData}
          />

          <div className="p-4 sm:p-6">
            {activeTab === 'incentives' && (
              <IncentivesTab
                propertyZip={project?.property_zip}
                bidScores={bidScores}
              />
            )}
            {activeTab === 'equipment' && (
              <EquipmentTab bids={bidEntries} />
            )}
            {activeTab === 'contractors' && (
              <ContractorsTab bids={bidEntries} />
            )}
            {activeTab === 'cost-scope' && (
              <CostScopeTab bids={bidEntries} />
            )}
            {activeTab === 'questions' && (
              <QuestionsTab
                bids={bidEntries}
                questions={questions}
                refreshQuestions={refreshQuestions}
              />
            )}
          </div>
        </div>

        {/* Export section */}
        {analysisStatus === 'complete' && (
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
        )}

        {/* Post-installation section */}
        {projectId && <PostInstallationSection projectId={projectId} />}
      </div>
    </div>
  );
}
