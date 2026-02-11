import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, ArrowRight, Users, Shield, X, Loader2, Info, Mail, FlaskConical, Save, Mic, MicOff } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';
import { useUser } from '../../hooks/useUser';
import { saveProjectRequirements, updateProjectDataSharingConsent, updateProject, validatePdfFile, updateProjectNotificationSettings } from '../../lib/database/bidsmartService';
import { uploadPdfFile, startBatchAnalysis, pollBatchExtractionStatus, type BatchExtractionStatus } from '../../lib/services/mindpalService';
import { AnalysisSubmissionInterstitial } from '../AnalysisSubmissionInterstitial';
import { useAnalysisNotification } from '../../hooks/useAnalysisNotification';
import { NotificationToast } from '../NotificationToast';
import { useSpeechToText } from '../../hooks/useSpeechToText';

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

type AnalysisState = 'idle' | 'submitting' | 'uploading' | 'analyzing' | 'complete' | 'error' | 'timeout';

export function GatherPhase() {
  const { projectId, project, bids, requirements, completePhase, refreshRequirements, refreshBids, ensureProjectExists } = usePhase();
  const { user } = useUser();

  const [priorities, setPriorities] = useState({
    price: requirements?.priority_price ?? 3,
    efficiency: requirements?.priority_efficiency ?? 3,
    warranty: requirements?.priority_warranty ?? 3,
    reputation: requirements?.priority_reputation ?? 3,
    timeline: requirements?.priority_timeline ?? 3,
  });

  const [uploadedPdfs, setUploadedPdfs] = useState<UploadedPdf[]>([]);
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysisProgress, setAnalysisProgress] = useState<BatchExtractionStatus | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisElapsedSeconds, setAnalysisElapsedSeconds] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dataSharingConsent, setDataSharingConsent] = useState(project?.data_sharing_consent ?? false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [projectDetails, setProjectDetails] = useState(project?.project_details ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationEmail, setNotificationEmail] = useState(project?.notification_email ?? '');
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(project?.notify_on_completion ?? true);
  const [savingNotification, setSavingNotification] = useState(false);
  const [notificationSaved, setNotificationSaved] = useState(false);
  const [enableSound, setEnableSound] = useState(true);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const { notify, requestPermission, permission, toggleSound } = useAnalysisNotification();

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
    if (requirements) {
      setPriorities({
        price: requirements.priority_price ?? 3,
        efficiency: requirements.priority_efficiency ?? 3,
        warranty: requirements.priority_warranty ?? 3,
        reputation: requirements.priority_reputation ?? 3,
        timeline: requirements.priority_timeline ?? 3,
      });
    }
  }, [requirements]);

  useEffect(() => {
    if (project) {
      setDataSharingConsent(project.data_sharing_consent ?? false);
      setProjectDetails(project.project_details ?? '');
      if (project.notification_email) {
        setNotificationEmail(project.notification_email);
      }
      setNotifyOnCompletion(project.notify_on_completion ?? true);
    }
  }, [project]);

  useEffect(() => {
    if (user?.email && !notificationEmail) {
      setNotificationEmail(user.email);
    }
  }, [user, notificationEmail]);

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

  const existingBidsCount = bids.filter(b => b.bid.total_bid_amount > 0 && b.bid.contractor_name).length;
  const validPendingCount = uploadedPdfs.filter(p => p.status === 'pending' || p.status === 'uploaded').length;
  const canContinue = validPendingCount >= 2 || existingBidsCount >= 2;

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


  const handleContinue = () => {
    if (!canContinue) return;
    // Show interstitial instead of starting immediately
    setAnalysisState('submitting');
  };

  const handleConfirmSubmission = async () => {
    setAnalysisError(null);

    try {
      const activeProjectId = projectId || await ensureProjectExists();

      await saveProjectRequirements(activeProjectId, {
        priority_price: priorities.price,
        priority_efficiency: priorities.efficiency,
        priority_warranty: priorities.warranty,
        priority_reputation: priorities.reputation,
        priority_timeline: priorities.timeline,
      });
      await updateProjectDataSharingConsent(activeProjectId, dataSharingConsent);
      if (projectDetails.trim()) {
        await updateProject(activeProjectId, { project_details: projectDetails });
      }

      if (uploadedPdfs.length > 0) {
        setAnalysisState('uploading');

        if (!user?.email) {
          setAnalysisState('error');
          setAnalysisError('User email not found');
          return;
        }

        // Get all files from uploadedPdfs
        const files = uploadedPdfs.map(p => p.file);

        if (files.length < 1) {
          setAnalysisState('error');
          setAnalysisError('Please upload at least 1 bid PDF to analyze.');
          return;
        }

        setAnalysisState('uploading');

        // Upload each PDF to Supabase Storage
        const pdfUploadIds: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`Uploading ${file.name} (${i + 1}/${files.length})`);
          
          const uploadResult = await uploadPdfFile(activeProjectId, file);
          if (uploadResult.error || !uploadResult.pdfUploadId) {
            setAnalysisState('error');
            setAnalysisError(uploadResult.error || `Failed to upload ${file.name}`);
            return;
          }
          pdfUploadIds.push(uploadResult.pdfUploadId);
        }

        console.log('All PDFs uploaded, starting analysis with IDs:', pdfUploadIds);
        setAnalysisState('analyzing');

        // Start analysis with the uploaded PDF IDs
        const analysisResult = await startBatchAnalysis(
          activeProjectId,
          pdfUploadIds,
          priorities,
          user.email,
          projectDetails
        );

        if (!analysisResult.success) {
          setAnalysisState('error');
          setAnalysisError(analysisResult.error || 'Failed to start analysis');
          return;
        }

        const pollResult = await pollBatchExtractionStatus(activeProjectId, {
          intervalMs: 3000,
          maxAttempts: 600, // Extended to 30 minutes for beta
          onProgress: (status) => {
            setAnalysisProgress(status);
          },
        });

        await refreshBids();

        if (!pollResult.allSuccessful && pollResult.processingPdfs > 0) {
          setAnalysisState('timeout');
          return;
        }

        setAnalysisState('complete');
        
        // Trigger notifications on completion
        if (enableSound) {
          await notify(activeProjectId, {
            title: 'Analysis Complete!',
            body: 'Your bid comparison is ready to view.',
            playSound: true,
            showBrowserNotification: true,
          });
        }
        setShowCompletionToast(true);
      }

      await refreshRequirements();
      completePhase(1);
    } catch (err) {
      console.error('Failed to process:', err);
      setAnalysisState('error');
      setAnalysisError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
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

  const handleSaveNotification = async () => {
    if (!projectId || !notificationEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(notificationEmail.trim())) {
      return;
    }

    setSavingNotification(true);
    try {
      await updateProjectNotificationSettings(projectId, notificationEmail.trim().toLowerCase(), notifyOnCompletion);
      setNotificationSaved(true);
      setTimeout(() => setNotificationSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save notification settings:', err);
    } finally {
      setSavingNotification(false);
    }
  };

  // Show interstitial when user clicks continue
  if (analysisState === 'submitting') {
    return (
      <>
        <AnalysisSubmissionInterstitial
          email={notificationEmail}
          onEmailChange={setNotificationEmail}
          notifyOnCompletion={notifyOnCompletion}
          onNotifyChange={setNotifyOnCompletion}
          enableSound={enableSound}
          onEnableSoundChange={(enabled) => {
            setEnableSound(enabled);
            toggleSound(enabled);
          }}
          onRequestNotificationPermission={requestPermission}
          notificationPermission={permission}
          bidCount={validPendingCount + existingBidsCount}
          onSaveAndContinue={handleConfirmSubmission}
          isSaving={false}
        />
        <NotificationToast
          show={showCompletionToast}
          title="Analysis Complete!"
          message="Your bid comparison is ready to view."
          onClose={() => setShowCompletionToast(false)}
        />
      </>
    );
  }

  if (analysisState === 'timeout') {
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail.trim());

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="w-16 h-16 bg-switch-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-switch-green-600" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">Your Submission is Saved and Queued</h2>
          <p className="text-gray-600 max-w-md">
            Your bids have been uploaded and are being processed. You can leave this page and come back later to view your results.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full space-y-4">
          <div>
            <label htmlFor="notification-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Enter your email to look up your analysis later
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="notification-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => {
                  setNotificationEmail(e.target.value);
                  setNotificationSaved(false);
                }}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnCompletion}
              onChange={(e) => {
                setNotifyOnCompletion(e.target.checked);
                setNotificationSaved(false);
              }}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500"
            />
            <span className="text-sm text-gray-700">
              Notify me by email when my analysis is ready
            </span>
          </label>

          <button
            onClick={handleSaveNotification}
            disabled={!isEmailValid || savingNotification}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            {savingNotification ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : notificationSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Email
              </>
            )}
          </button>
        </div>

        {analysisProgress && (
          <div className="w-full max-w-md space-y-3">
            <p className="text-sm text-center text-gray-600">
              Processing: {analysisProgress.completedPdfs} of {analysisProgress.totalPdfs} bids completed
            </p>
            <div className="space-y-2">
              {analysisProgress.pdfStatuses.map(pdf => (
                <div key={pdf.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="truncate flex-1 mr-2">{pdf.fileName}</span>
                  <span className={`
                    px-2 py-0.5 rounded text-xs font-medium
                    ${pdf.status === 'extracted' || pdf.status === 'verified' ? 'bg-green-100 text-green-700' : ''}
                    ${pdf.status === 'processing' || pdf.status === 'uploaded' ? 'bg-amber-100 text-amber-700' : ''}
                    ${pdf.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {pdf.status === 'extracted' || pdf.status === 'verified' ? 'Done' : ''}
                    {pdf.status === 'processing' || pdf.status === 'uploaded' ? 'Processing...' : ''}
                    {pdf.status === 'failed' ? 'Failed' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md w-full">
          <div className="flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Beta Testing</p>
              <p className="text-sm text-gray-600 mt-1">
                We are actively improving processing speed. Thank you for your patience!
              </p>
            </div>
          </div>
        </div>

        {analysisProgress && analysisProgress.completedPdfs >= 2 && (
          <button
            onClick={() => {
              setAnalysisState('complete');
              completePhase(1);
            }}
            className="text-sm text-switch-green-600 hover:text-switch-green-700 underline"
          >
            Continue with {analysisProgress.completedPdfs} completed bids
          </button>
        )}

        <p className="text-xs text-gray-500 text-center max-w-md">
          You can close this page. Use your email address to find your analysis on the home page when you return.
        </p>
      </div>
    );
  }

  if (analysisState === 'uploading' || analysisState === 'analyzing') {
    const showLongWaitMessage = analysisElapsedSeconds > 120;

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="w-16 h-16 bg-switch-green-100 rounded-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-switch-green-600 animate-spin" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {analysisState === 'uploading' ? 'Uploading Your Bids...' : 'Analyzing Your Bids...'}
          </h2>
          <p className="text-gray-600 max-w-md">
            {analysisState === 'uploading'
              ? 'We are securely uploading your bid documents.'
              : 'Our AI is extracting and comparing data from your bid documents. This usually takes 1-3 minutes.'}
          </p>
          {analysisState === 'analyzing' && (
            <p className="text-sm text-gray-500">
              Elapsed: {formatElapsedTime(analysisElapsedSeconds)}
            </p>
          )}
        </div>

        {showLongWaitMessage && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md">
            <div className="flex items-start gap-3">
              <FlaskConical className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Taking longer than usual</p>
                <p className="text-sm text-amber-700 mt-1">
                  Complex documents may take extra time. Thank you for your patience during our alpha testing!
                </p>
              </div>
            </div>
          </div>
        )}

        {analysisProgress && (
          <div className="w-full max-w-md space-y-4">
            <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-switch-green-600 h-full transition-all duration-500"
                style={{
                  width: `${analysisProgress.totalPdfs > 0
                    ? ((analysisProgress.completedPdfs + analysisProgress.failedPdfs) / analysisProgress.totalPdfs) * 100
                    : 0}%`
                }}
              />
            </div>
            <p className="text-sm text-center text-gray-600">
              {analysisProgress.completedPdfs} of {analysisProgress.totalPdfs} bids processed
            </p>

            <div className="space-y-2">
              {analysisProgress.pdfStatuses.map(pdf => (
                <div key={pdf.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="truncate flex-1 mr-2">{pdf.fileName}</span>
                  <span className={`
                    px-2 py-0.5 rounded text-xs font-medium
                    ${pdf.status === 'extracted' || pdf.status === 'verified' ? 'bg-green-100 text-green-700' : ''}
                    ${pdf.status === 'processing' || pdf.status === 'uploaded' ? 'bg-blue-100 text-blue-700' : ''}
                    ${pdf.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {pdf.status === 'extracted' || pdf.status === 'verified' ? 'Done' : ''}
                    {pdf.status === 'processing' || pdf.status === 'uploaded' ? 'Processing...' : ''}
                    {pdf.status === 'failed' ? 'Failed' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gather Your Bids</h1>
        <p className="text-gray-600 mt-1">
          Upload your contractor bids to compare, then tell us what matters most to you.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">One-Time Analysis</p>
            <p className="text-sm text-amber-700 mt-1">
              Upload all the bids you want to compare before clicking Continue. All bids will be analyzed together.
              If you need to add more bids later, you can re-run the analysis with all documents.
            </p>
          </div>
        </div>
      </div>

      {analysisError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Analysis Error</p>
              <p className="text-sm text-red-700 mt-1">{analysisError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-switch-green-600" />
          Upload Your Bids
        </h2>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
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
            border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
            ${dragActive ? 'border-switch-green-500 bg-switch-green-50' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-2">Drag and drop PDF bid documents here</p>
          <p className="text-sm text-gray-400 mb-4">or</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Browse Files
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Supported formats: PDF (max 25MB each)
          </p>
        </div>

        {uploadedPdfs.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Files to Upload ({uploadedPdfs.length})</h3>
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
                  <button
                    onClick={() => removeFile(pdf.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {existingBidsCount > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Previously Analyzed Bids ({existingBidsCount})</h3>
            {bids.filter(b => b.bid.total_bid_amount > 0).map((item) => (
              <div
                key={item.bid.id}
                className="flex items-center justify-between p-4 bg-green-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-switch-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.bid.contractor_name || item.bid.contractor_company || 'Unknown Contractor'}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${item.bid.total_bid_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-switch-green-600" />
              </div>
            ))}
          </div>
        )}

      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">What Matters Most to You?</h2>
        <p className="text-sm text-gray-600 mb-6">
          Adjust these sliders to reflect your priorities. We will use these to highlight the best options for you.
        </p>

        <div className="space-y-6">
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
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tell Us About Your Project</h2>
        <p className="text-sm text-gray-600 mb-4">
          Share any details about your home, priorities, or what you care about in a contractor. This is optional but helps us provide better guidance.
        </p>
        <div className="relative">
          <textarea
            value={projectDetails}
            onChange={(e) => setProjectDetails(e.target.value)}
            placeholder="For example: My home is a 1950s ranch with poor insulation. I'm looking for a contractor who is patient with explaining technical details and has experience with older homes. Budget is somewhat flexible but I want to prioritize long-term savings over upfront cost..."
            rows={6}
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
        <p className="text-xs text-gray-500 mt-2">
          This information helps us understand your unique needs and provide more personalized recommendations.
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
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
              Your pricing data helps others understand fair market rates in your area.
              All personal and contractor details are removed before sharing.
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
                  <li>Project scope (system size, features included)</li>
                </ul>
                <p className="font-medium text-gray-900 mb-2">Data that is NEVER shared:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your name, email, or contact information</li>
                  <li>Your exact address</li>
                  <li>Contractor names or contact details</li>
                  <li>Original PDF documents</li>
                </ul>
                <p className="mt-4 text-gray-500 text-xs">
                  You can change this preference at any time in your project settings.
                </p>
              </div>
            )}
          </div>
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-switch-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Get Notified When Ready</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Bid analysis typically takes 2-3 minutes. We'll email you when your results are ready to view.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="notify-email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="notify-email"
              type="email"
              value={notificationEmail}
              onChange={(e) => {
                setNotificationEmail(e.target.value);
                setNotificationSaved(false);
              }}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnCompletion}
              onChange={(e) => {
                setNotifyOnCompletion(e.target.checked);
                setNotificationSaved(false);
              }}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700">
              Send me an email when my analysis is complete
            </span>
          </label>

          {notificationEmail && (
            <button
              type="button"
              onClick={handleSaveNotification}
              disabled={savingNotification || !notificationEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail.trim())}
              className="btn btn-secondary text-sm flex items-center gap-2"
            >
              {savingNotification ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : notificationSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Notification Settings
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="btn btn-primary flex items-center gap-2 px-6"
        >
          Continue to Compare
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {!canContinue && (
        <p className="text-center text-sm text-gray-500">
          Upload at least 1 bid to continue
        </p>
      )}

      <NotificationToast
        show={showCompletionToast}
        title="Analysis Complete!"
        message="Your bid comparison is ready to view."
        onClose={() => setShowCompletionToast(false)}
      />
    </div>
  );
}
