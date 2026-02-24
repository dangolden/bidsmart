import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, BarChart3, CheckCircle, ClipboardCheck, FileText, X, Clock, CheckCircle2, AlertCircle, ArrowRight, Users, Shield, Info, Mail, Loader2, ChevronRight, Mic, MicOff } from 'lucide-react';
import type { UserExt } from '../lib/types';
import { ReturningUserSection } from './ReturningUserSection';
import { TryTheToolSection } from './TryTheToolSection';
import { AnalysisSuccessScreen } from './AnalysisSuccessScreen';
import { updateProject, saveProjectRequirements, updateProjectDataSharingConsent, updateProjectNotificationSettings, validatePdfFile, getProjectBySessionId, createDraftProject, getPublicDemoProjects } from '../lib/database/bidsmartService';
import { uploadPdfFile, startBatchAnalysis, type DocumentForAnalysis } from '../lib/services/mindpalService';
import { useSpeechToText } from '../hooks/useSpeechToText';
import SwitchLogo from '../assets/switchlogo.svg';

const SESSION_ID_KEY = 'bidsmart_session_id';

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

const PHASES = [
  {
    number: 1,
    label: 'GATHER',
    title: 'Upload & Prioritize',
    description: 'Upload contractor bids and set your priorities',
    icon: Upload,
    color: 'bg-switch-green-100 text-switch-green-700',
  },
  {
    number: 2,
    label: 'COMPARE',
    title: 'Analyze Options',
    description: 'Compare equipment, costs, and contractors side-by-side',
    icon: BarChart3,
    color: 'bg-blue-100 text-blue-700',
  },
  {
    number: 3,
    label: 'DECIDE',
    title: 'Make Your Choice',
    description: 'Review incentives and select your contractor',
    icon: CheckCircle,
    color: 'bg-amber-100 text-amber-700',
  },
  {
    number: 4,
    label: 'VERIFY',
    title: 'Quality Check',
    description: 'Ensure proper installation with our checklist',
    icon: ClipboardCheck,
    color: 'bg-teal-100 text-teal-700',
  },
];

interface PrioritySliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  description: string;
}

function PrioritySlider({ label, value, onChange, description }: PrioritySliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">{value}/5</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-switch-green-600"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

interface UploadedPdf {
  id: string;
  file: File;
  pdfUploadId?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
}

type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'submitted' | 'complete' | 'error' | 'timeout';

interface UnifiedHomePageProps {
  user: UserExt;
  onSelectProject: (projectId: string) => void;
}

export function UnifiedHomePage({ user, onSelectProject }: UnifiedHomePageProps) {
  const [uploadedPdfs, setUploadedPdfs] = useState<UploadedPdf[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [priorities, setPriorities] = useState({
    price: 3,
    efficiency: 3,
    warranty: 3,
    reputation: 3,
    timeline: 3,
  });

  const [projectDetails, setProjectDetails] = useState('');
  const [dataSharingConsent, setDataSharingConsent] = useState(true);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');

  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisElapsedSeconds, setAnalysisElapsedSeconds] = useState(0);
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [demoProjectId, setDemoProjectId] = useState<string | null>(null);
  const [showPriorities, setShowPriorities] = useState(true);
  const [showProjectDetails, setShowProjectDetails] = useState(true);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const heroSectionRef = useRef<HTMLDivElement>(null);

  // Speech-to-text for project details
  const { 
    isListening, 
    isSupported: isSpeechSupported, 
    toggleListening,
    error: speechError 
  } = useSpeechToText({
    onResult: (transcript) => {
      setProjectDetails((prev) => prev + (prev ? ' ' : '') + transcript);
    },
  });

  useEffect(() => {
    checkForDraftProject();
    loadDemoProject();
  }, [user.id]);

  const loadDemoProject = async () => {
    try {
      const demos = await getPublicDemoProjects();
      if (demos.length > 0) {
        setDemoProjectId(demos[0].id);
      }
    } catch (err) {
      console.error('Failed to load demo project:', err);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (heroSectionRef.current) {
        const heroBottom = heroSectionRef.current.getBoundingClientRect().bottom;
        if (heroBottom <= 0 && !isHeaderSticky) {
          setIsHeaderSticky(true);
          window.scrollTo({ top: heroSectionRef.current.offsetHeight, behavior: 'instant' });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHeaderSticky]);

  const handleReturnToDashboard = () => {
    setIsHeaderSticky(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (analysisState === 'analyzing') {
      setAnalysisElapsedSeconds(0);
      analysisTimerRef.current = setInterval(() => {
        setAnalysisElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (analysisTimerRef.current) {
        clearInterval(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
    }
    return () => {
      if (analysisTimerRef.current) {
        clearInterval(analysisTimerRef.current);
      }
    };
  }, [analysisState]);

  async function checkForDraftProject() {
    const sessionId = getOrCreateSessionId();
    try {
      const existingDraft = await getProjectBySessionId(sessionId);
      if (existingDraft) {
        setDraftProjectId(existingDraft.id);
      }
    } catch (err) {
      console.error('Failed to check for draft project:', err);
    }
  }

  async function ensureDraftProject(): Promise<string> {
    if (draftProjectId) {
      return draftProjectId;
    }

    const sessionId = getOrCreateSessionId();
    const project = await createDraftProject(user.id, sessionId);
    setDraftProjectId(project.id);
    return project.id;
  }

  const validPendingCount = uploadedPdfs.filter(p => p.status === 'pending' || p.status === 'uploaded').length;
  const canContinue = validPendingCount >= 1;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail.trim());

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: UploadedPdf[] = [];

    for (const file of fileArray) {
      const validationError = validatePdfFile(file);
      if (validationError) {
        validFiles.push({
          id: crypto.randomUUID(),
          file,
          status: 'error',
          progress: 0,
          error: validationError.message,
        });
      } else {
        validFiles.push({
          id: crypto.randomUUID(),
          file,
          status: 'pending',
          progress: 0,
        });
      }
    }

    setUploadedPdfs(prev => [...prev, ...validFiles]);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setUploadedPdfs(prev => prev.filter(p => p.id !== id));
  };

  const getStatusIcon = (status: UploadedPdf['status']) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle2 className="w-5 h-5 text-switch-green-600" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleAnalyze = async () => {
    if (!canContinue || !isEmailValid) return;

    setAnalysisError(null);

    try {
      const projectId = draftProjectId || await ensureDraftProject();

      await updateProjectNotificationSettings(projectId, notificationEmail.trim().toLowerCase(), true);

      await saveProjectRequirements(projectId, {
        priority_price: priorities.price,
        priority_efficiency: priorities.efficiency,
        priority_warranty: priorities.warranty,
        priority_reputation: priorities.reputation,
        priority_timeline: priorities.timeline,
      });

      await updateProjectDataSharingConsent(projectId, dataSharingConsent);

      if (projectDetails.trim()) {
        await updateProject(projectId, { project_details: projectDetails });
      }

      await updateProject(projectId, { status: 'collecting_bids' });

      const files = uploadedPdfs.map(p => p.file);

      if (files.length < 1) {
        setAnalysisError('Please upload at least 1 bid PDF to analyze.');
        return;
      }

      setAnalysisState('uploading');

      // Upload each PDF to Supabase Storage + create bid stubs
      const pdfUploadIds: string[] = [];
      const documents: DocumentForAnalysis[] = [];
      const batchRequestId = crypto.randomUUID();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Uploading ${file.name} (${i + 1}/${files.length})`);

        const uploadResult = await uploadPdfFile(projectId, file, batchRequestId);
        if (uploadResult.error || !uploadResult.pdfUploadId) {
          setAnalysisState('error');
          setAnalysisError(uploadResult.error || `Failed to upload ${file.name}`);
          return;
        }
        pdfUploadIds.push(uploadResult.pdfUploadId);

        // V2: Track bid_id ↔ pdf_upload_id pairing for MindPal
        if (uploadResult.bidId) {
          documents.push({
            bid_id: uploadResult.bidId,
            pdf_upload_id: uploadResult.pdfUploadId,
          });
        }
      }

      console.log('All PDFs uploaded, starting analysis with IDs:', pdfUploadIds, 'documents:', documents);
      setAnalysisState('analyzing');

      // Start analysis with V2 documents array (bid_id + pdf_upload_id pairs)
      const analysisResult = await startBatchAnalysis(
        projectId,
        pdfUploadIds,
        priorities,
        user.email,
        projectDetails,
        documents.length > 0 ? documents : undefined
      );

      if (!analysisResult.success) {
        setAnalysisState('error');
        setAnalysisError(analysisResult.error || 'Failed to start analysis');
        return;
      }

      // Save processing project info for banner display when viewing demo
      try {
        localStorage.setItem('bidsmart_processing_project', JSON.stringify({
          id: projectId,
          email: notificationEmail,
        }));
      } catch {
        // Ignore localStorage errors
      }

      // Show success screen - analysis takes 20-30 minutes
      setAnalysisState('submitted');
    } catch (err) {
      console.error('Failed to process:', err);
      setAnalysisState('error');
      setAnalysisError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  if (analysisState === 'submitted') {
    return (
      <AnalysisSuccessScreen
        email={notificationEmail}
        projectId={draftProjectId || ''}
        onViewDemo={() => {
          if (demoProjectId) {
            onSelectProject(demoProjectId);
          }
        }}
        onReturnHome={() => {
          setAnalysisState('idle');
          setUploadedPdfs([]);
          setDraftProjectId(null);
        }}
        onViewResults={() => {
          if (draftProjectId) {
            onSelectProject(draftProjectId);
          }
        }}
      />
    );
  }

  if (analysisState === 'analyzing' || analysisState === 'uploading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="w-16 h-16 bg-switch-green-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-switch-green-600 animate-spin" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Uploading Your Bids...
              </h2>
              <p className="text-gray-600 max-w-md">
                Preparing your documents for analysis.
              </p>
              <p className="text-sm text-gray-500">
                Elapsed: {formatElapsedTime(analysisElapsedSeconds)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (analysisState === 'timeout') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="w-16 h-16 bg-switch-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-switch-green-600" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Your Submission is Saved</h2>
              <p className="text-gray-600 max-w-md">
                Your bids are being processed. You will receive an email at <strong>{notificationEmail}</strong> when your analysis is ready.
              </p>
            </div>

            <p className="text-sm text-gray-500 text-center max-w-md">
              You can close this page. Use your email address to find your analysis when you return.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {!isHeaderSticky && (
        <div ref={heroSectionRef} className="max-w-4xl w-full mx-auto px-4 py-8">
          <div className="flex items-center justify-center mb-6">
            <img src={SwitchLogo} alt="SwitchIsOn" className="h-12 w-auto" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Heat Pump Bid Compare Tool <span className="text-base font-normal text-gray-500">(Beta)</span>
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm">
              Upload your contractor bids to get an AI-powered comparison and make an informed decision.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ReturningUserSection onSelectProject={onSelectProject} />
            <TryTheToolSection onSelectDemo={onSelectProject} />
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {isHeaderSticky && (
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <button
                onClick={handleReturnToDashboard}
                className="flex items-center gap-2 text-gray-600 hover:text-switch-green-600 transition-colors group min-h-[44px] -my-2 py-2"
                aria-label="Return to Bid Compare Dashboard"
              >
                <img src={SwitchLogo} alt="Switch Is On" className="w-8 h-8" />
                <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
              </button>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-sm font-medium text-gray-900 truncate">
                Start New Comparison
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            {PHASES.map((phase, index) => {
              const isActive = phase.number === 1;

              return (
                <div key={phase.number} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 transition-all min-w-0">
                    <div
                      className={`
                        w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors flex-shrink-0
                        ${isActive ? 'bg-switch-green-600 text-white' : 'bg-gray-200 text-gray-400'}
                      `}
                    >
                      {phase.number}
                    </div>
                    <span
                      className={`
                        text-xs sm:text-sm font-medium hidden md:block truncate
                        ${isActive ? 'text-gray-900' : 'text-gray-500'}
                      `}
                    >
                      {phase.label}
                    </span>
                  </div>

                  {index < PHASES.length - 1 && (
                    <div className="flex-1 mx-2 sm:mx-3 min-w-[12px]">
                      <div className="h-0.5 bg-gray-200 transition-colors" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-switch-green-600 transition-all duration-500"
              style={{ width: '0%' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Upload className="w-5 h-5 text-switch-green-600" />
            Start a New Bid Comparison
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Upload your contractor bid documents to compare (PDF, DOC, or DOCX).
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">One-Time Analysis</p>
                <p className="text-sm text-amber-700 mt-1">
                  Upload all the bids you want to compare before clicking Analyze. All bids will be analyzed together.
                </p>
              </div>
            </div>
          </div>

          {analysisError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1">{analysisError}</p>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer
              ${dragActive ? 'border-switch-green-500 bg-switch-green-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-1.5 text-sm">Drag and drop bid documents here</p>
            <p className="text-sm text-gray-400 mb-3">or</p>
            <button
              type="button"
              className="btn btn-secondary text-sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Files
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Supported formats: PDF, DOC, DOCX (max 25MB each)
            </p>
          </div>

          {uploadedPdfs.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Uploaded Files ({uploadedPdfs.length})</h3>
              {uploadedPdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    pdf.status === 'error' ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{pdf.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(pdf.file.size)}
                        {pdf.error && <span className="text-red-600 ml-2">{pdf.error}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(pdf.status)}
                    <button onClick={() => removeFile(pdf.id)} className="p-1 hover:bg-gray-200 rounded">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowPriorities(!showPriorities)}
              className="w-full flex items-center justify-between text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <h3 className="font-medium text-gray-900">What Matters Most to You?</h3>
                <p className="text-sm text-gray-500">Set your priorities for the comparison (optional)</p>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${showPriorities ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPriorities && (
              <div className="mt-4 space-y-6 px-1">
                <PrioritySlider
                  label="Upfront Cost"
                  value={priorities.price}
                  onChange={(v) => setPriorities(p => ({ ...p, price: v }))}
                  description="How important is getting the lowest price?"
                />
                <PrioritySlider
                  label="Energy Efficiency / Long-term Savings"
                  value={priorities.efficiency}
                  onChange={(v) => setPriorities(p => ({ ...p, efficiency: v }))}
                  description="Higher efficiency means lower utility bills over time"
                />
                <PrioritySlider
                  label="Warranty Length"
                  value={priorities.warranty}
                  onChange={(v) => setPriorities(p => ({ ...p, warranty: v }))}
                  description="Longer warranties provide peace of mind"
                />
                <PrioritySlider
                  label="Contractor Reputation"
                  value={priorities.reputation}
                  onChange={(v) => setPriorities(p => ({ ...p, reputation: v }))}
                  description="Experience, reviews, and certifications"
                />
                <PrioritySlider
                  label="Installation Timeline"
                  value={priorities.timeline}
                  onChange={(v) => setPriorities(p => ({ ...p, timeline: v }))}
                  description="How quickly can they complete the work?"
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowProjectDetails(!showProjectDetails)}
              className="w-full flex items-center justify-between text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <h3 className="font-medium text-gray-900">Tell Us About Your Project</h3>
                <p className="text-sm text-gray-500">Share details for better recommendations (optional)</p>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${showProjectDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showProjectDetails && (
              <div className="mt-4 px-1">
                <div className="relative">
                  <textarea
                    value={projectDetails}
                    onChange={(e) => setProjectDetails(e.target.value)}
                    placeholder="For example: My home is a 1950s ranch with poor insulation. I'm looking for a contractor who is patient with explaining technical details..."
                    rows={4}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent text-sm resize-none"
                  />
                  {isSpeechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`absolute right-3 top-3 p-2 rounded-full transition-colors ${
                        isListening 
                          ? 'bg-red-100 text-red-600 animate-pulse' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={isListening ? 'Stop dictation' : 'Start dictation'}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {speechError && (
                  <p className="text-xs text-red-600 mt-1">{speechError}</p>
                )}
                {isListening && (
                  <p className="text-xs text-switch-green-600 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Listening... speak now
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={dataSharingConsent}
                  onChange={(e) => setDataSharingConsent(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-switch-green-600" />
                  <span className="font-medium text-gray-900">
                    Help other homeowners by sharing anonymized bid data
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your pricing data helps others understand fair market rates.
                  All personal and contractor details are removed.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPrivacyDetails(!showPrivacyDetails);
                  }}
                  className="text-sm text-switch-green-600 hover:text-switch-green-700 mt-2 flex items-center gap-1"
                >
                  <Shield className="w-3.5 h-3.5" />
                  {showPrivacyDetails ? 'Hide privacy details' : 'What data is shared?'}
                </button>

                {showPrivacyDetails && (
                  <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
                    <p className="font-medium text-gray-900 mb-2">Data that IS shared (anonymized):</p>
                    <ul className="list-disc list-inside space-y-1 mb-4">
                      <li>Bid amounts and pricing breakdowns</li>
                      <li>Equipment types, efficiency ratings, and specifications</li>
                      <li>General location (ZIP code area only)</li>
                    </ul>
                    <p className="font-medium text-gray-900 mb-2">Data that is NEVER shared:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Your name, email, or contact information</li>
                      <li>Contractor names or contact details</li>
                      <li>Original PDF documents</li>
                    </ul>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Used to retrieve your analysis later and notify you when processing is complete
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!canContinue || !isEmailValid}
              className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              Analyze My Bids
              <ArrowRight className="w-4 h-4" />
            </button>

            {(!canContinue || !isEmailValid) && (
              <p className="text-center text-sm text-gray-500 mt-3">
                {!canContinue
                  ? 'Upload at least 1 bid to continue'
                  : 'Enter a valid email address to continue'}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 pb-4">
          Powered by TheSwitchIsOn.org
        </p>
      </div>
    </div>
  );
}
