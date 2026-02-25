import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, ArrowRight, HelpCircle, FlaskConical, Download, FileCheck2, AlertTriangle } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';
import { IncentivesTable } from '../IncentivesTable';
// PAUSED: re-enable when FAQ data flows from MindPal
// import { OverallFaqsCard } from '../OverallFaqsCard';
// import { BidSpecificFaqsCard } from '../BidSpecificFaqsCard';
import { ContractorQuestionsPanel } from '../questions/ContractorQuestionsPanel';
import type { RebateProgram } from '../../lib/types';
// PAUSED: re-enable when FAQ data flows from MindPal
// import type { ProjectFaqData } from '../../lib/types';
import { getIncentivesByZip } from '../../lib/database/bidsmartService';
// PAUSED: re-enable when FAQ data flows from MindPal
// import { getFaqsByProject } from '../../lib/database/bidsmartService';
import { zipToState } from '../../lib/utils/zipToState';

type DecideTab = 'incentives' | 'questions';

interface TabConfig {
  key: DecideTab;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export function DecidePhase() {
  const { bids, questions, completePhase, projectId, project } = usePhase();
  const [activeTab, setActiveTab] = useState<DecideTab>('incentives');
  const [rebatePrograms, setRebatePrograms] = useState<RebateProgram[]>([]);
  const [selectedIncentives, setSelectedIncentives] = useState<Set<string>>(new Set());
  const [selectedContractor] = useState<string | null>(null);
  // PAUSED: re-enable when FAQ data flows from MindPal
  // const [projectFaqData, setProjectFaqData] = useState<ProjectFaqData>({ overall: [], by_bid: [] });

  useEffect(() => {
    loadRebatePrograms();
    // PAUSED: re-enable when FAQ data flows from MindPal
    // loadAllFaqs();
  }, [projectId, bids, project]);

  const loadRebatePrograms = async () => {
    const zip = project?.property_zip;
    const stateCode = zip ? zipToState(zip) : undefined;
    try {
      const data = await getIncentivesByZip(zip || '', stateCode || undefined);
      if (data) {
        setRebatePrograms(data);
        setSelectedIncentives(new Set(data.map(p => p.id)));
      }
    } catch (error) {
      console.error('Error loading incentives:', error);
    }
  };

  // PAUSED: re-enable when FAQ data flows from MindPal
  // const loadAllFaqs = async () => {
  //   if (!projectId || bids.length === 0) return;
  //   try {
  //     const faqData = await getFaqsByProject(projectId, bids);
  //     setProjectFaqData(faqData);
  //   } catch (error) {
  //     console.error('Error loading FAQs:', error);
  //   }
  // };

  const toggleIncentive = (programId: string) => {
    const newSelected = new Set(selectedIncentives);
    if (newSelected.has(programId)) {
      newSelected.delete(programId);
    } else {
      newSelected.add(programId);
    }
    setSelectedIncentives(newSelected);
  };

  const handleContinue = () => {
    completePhase(3);
  };

  const getSelectedContractorName = () => {
    if (!selectedContractor) return '';
    const bid = bids.find(b => b.bid.id === selectedContractor);
    return bid?.bid.contractor_name || 'Unknown';
  };

  function handleDownloadChecklist() {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contractor-checklist?project_id=${projectId}`;
    window.open(url, '_blank');
  }

  const tabs: TabConfig[] = [
    {
      key: 'incentives',
      label: 'Available Incentives',
      description: 'Select rebates you plan to apply for',
      icon: <DollarSign className="w-5 h-5" />
    },
    // PAUSED: re-enable when FAQ data flows from MindPal
    // {
    //   key: 'faqs',
    //   label: 'Common Questions',
    //   description: 'Questions about your bids and contractors',
    //   icon: <BookOpen className="w-5 h-5" />
    // },
    {
      key: 'questions',
      label: 'Contractor Questions',
      description: 'Ask contractors for clarification',
      icon: <HelpCircle className="w-5 h-5" />
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Make Your Decision</h1>
        <p className="text-gray-600 mt-1">
          Review incentives, ask questions, and understand your bids to choose the best contractor.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <FlaskConical className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <span className="font-medium">Alpha:</span> Rebate eligibility and amounts are estimates. Always verify with the program administrator before making decisions.
        </p>
      </div>

      {/* Red Flags Alert */}
      {bids.some(b => b.scores?.red_flags && b.scores.red_flags.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900 mb-2">Potential Issues Identified</h3>
              <div className="space-y-2">
                {bids.filter(b => b.scores?.red_flags && b.scores.red_flags.length > 0).map(b => (
                  <div key={b.bid.id} className="text-sm">
                    <span className="font-medium text-red-800">{b.bid.contractor_name}:</span>
                    <ul className="list-disc ml-5 mt-1 text-red-700">
                      {b.scores?.red_flags?.slice(0, 3).map((flag, i) => (
                        <li key={i}>{flag.issue}</li>
                      ))}
                      {b.scores?.red_flags && b.scores.red_flags.length > 3 && (
                        <li className="text-red-500">+{b.scores.red_flags.length - 3} more issues</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Positive Indicators */}
      {bids.some(b => b.scores?.positive_indicators && b.scores.positive_indicators.length > 0) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900 mb-2">Positive Indicators</h3>
              <div className="space-y-2">
                {bids.filter(b => b.scores?.positive_indicators && b.scores.positive_indicators.length > 0).map(b => (
                  <div key={b.bid.id} className="text-sm">
                    <span className="font-medium text-green-800">{b.bid.contractor_name}:</span>
                    <ul className="list-disc ml-5 mt-1 text-green-700">
                      {b.scores?.positive_indicators?.slice(0, 3).map((indicator, i) => (
                        <li key={i}>{indicator.indicator}</li>
                      ))}
                      {b.scores?.positive_indicators && b.scores.positive_indicators.length > 3 && (
                        <li className="text-green-500">+{b.scores.positive_indicators.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
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
                    {index + 1} of {tabs.length}
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

      {selectedContractor && (
        <div className="bg-gradient-to-r from-switch-green-50 to-blue-50 border-2 border-switch-green-300 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg">
              <FileCheck2 className="w-8 h-8 text-switch-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-switch-green-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {getSelectedContractorName()} Selected
                </h3>
              </div>
              <p className="text-gray-700 mb-4">
                Give your contractor this quality installation checklist before work begins.
                It sets clear expectations and ensures industry-standard practices are followed.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadChecklist}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Checklist
                </button>
                <div className="text-sm text-gray-600 flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200">
                  <span className="font-medium">Next Step:</span> Share this with your contractor before installation
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'incentives' && (
        <div className="space-y-6">
          {rebatePrograms.length > 0 ? (
            <IncentivesTable
              rebatePrograms={rebatePrograms}
              selectedIncentives={selectedIncentives}
              onToggleIncentive={toggleIncentive}
            />
          ) : (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Incentives Available</h3>
              <p className="text-gray-600">There are currently no active rebate programs in the system.</p>
            </div>
          )}
        </div>
      )}

      {/* PAUSED: re-enable when FAQ data flows from MindPal
      {activeTab === 'faqs' && (
        <div className="space-y-6">
          {bids.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bids Available</h3>
              <p className="text-gray-600">Upload your contractor bids to see common questions and answers.</p>
            </div>
          ) : (
            <>
              {projectFaqData.overall.length > 0 && (
                <OverallFaqsCard faqs={projectFaqData.overall} />
              )}

              {projectFaqData.by_bid.length > 0 && (
                <BidSpecificFaqsCard
                  bidFaqSets={projectFaqData.by_bid}
                  switchPreferredBids={new Set<string>()}
                />
              )}

              {projectFaqData.overall.length === 0 && projectFaqData.by_bid.length === 0 && (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Common Questions Data Available Yet</h3>
                  <p className="text-gray-600">
                    Answers will be generated by AI during bid processing. Check back soon!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
      */}

      {activeTab === 'questions' && (
        <ContractorQuestionsPanel bids={bids} questions={questions} />
      )}

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Marking a contractor as your choice is optional and for your reference only.
          You will work directly with your chosen contractor to finalize the installation.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="btn btn-primary flex items-center gap-2 px-6"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
