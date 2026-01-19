import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, BarChart3, MessageSquareText, ClipboardCheck,
  Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import * as db from '../lib/database/bidsmartService';
import { uploadAndExtract } from '../lib/services/mindpalService';
import type { UserExt, Project, ContractorBid, PdfUpload } from '../lib/types';

// Components
import { BidUploadZone } from '../components/BidUploadZone';
import { BidComparisonTable } from '../components/BidComparisonTable';
import { ContractorQuestions } from '../components/ContractorQuestions';
import { QIIChecklist } from '../components/QIIChecklist';
import { BidCard } from '../components/BidCard';

interface ProjectPageProps {
  user: UserExt;
}

type TabId = 'bids' | 'compare' | 'questions' | 'checklist';

export function ProjectPage({ user }: ProjectPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [bids, setBids] = useState<ContractorBid[]>([]);
  const [pdfUploads, setPdfUploads] = useState<PdfUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('bids');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  async function loadProjectData() {
    if (!projectId) return;
    
    try {
      const [projectData, bidsData, uploadsData] = await Promise.all([
        db.getProject(projectId),
        db.getBidsByProject(projectId),
        db.getPdfUploadsByProject(projectId),
      ]);
      
      setProject(projectData);
      setBids(bidsData);
      setPdfUploads(uploadsData);
      
      // Auto-switch to compare tab if we have bids
      if (bidsData.length >= 2) {
        setActiveTab('compare');
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(files: FileList) {
    if (!projectId) return;
    
    setUploading(true);
    
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        alert(`${file.name} is not a PDF file`);
        continue;
      }

      try {
        const result = await uploadAndExtract(projectId, file);
        if (result.success) {
          // Refresh data
          await loadProjectData();
        } else {
          alert(`Error uploading ${file.name}: ${result.error}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Error uploading ${file.name}`);
      }
    }
    
    setUploading(false);
  }

  const tabs = [
    { id: 'bids' as TabId, label: 'Bids', icon: Upload, count: bids.length },
    { id: 'compare' as TabId, label: 'Compare', icon: BarChart3, disabled: bids.length < 2 },
    { id: 'questions' as TabId, label: 'Questions', icon: MessageSquareText, disabled: bids.length === 0 },
    { id: 'checklist' as TabId, label: 'QII Checklist', icon: ClipboardCheck },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-switch-green-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Project not found</h2>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary mt-4">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
            <p className="text-gray-600">{bids.length} bid{bids.length !== 1 ? 's' : ''} uploaded</p>
          </div>
        </div>
        <button
          onClick={loadProjectData}
          className="btn btn-secondary"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Processing Status Banner */}
      {pdfUploads.some(u => u.status === 'processing') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Processing bids...</p>
            <p className="text-sm text-blue-700">
              {pdfUploads.filter(u => u.status === 'processing').length} bid(s) are being analyzed. 
              This usually takes 1-2 minutes.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <tab.icon className="w-4 h-4 inline mr-2" />
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'bids' && (
          <div className="space-y-6">
            {/* Upload Zone */}
            <BidUploadZone 
              onUpload={handleFileUpload}
              uploading={uploading}
            />

            {/* Uploaded Bids */}
            {bids.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Uploaded Bids</h2>
                <div className="grid gap-4">
                  {bids.map((bid) => (
                    <BidCard 
                      key={bid.id} 
                      bid={bid} 
                      pdfUpload={pdfUploads.find(u => u.extracted_bid_id === bid.id)}
                      onUpdate={loadProjectData}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Processing PDFs */}
            {pdfUploads.filter(u => u.status === 'processing' || u.status === 'uploaded').length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Processing</h2>
                {pdfUploads
                  .filter(u => u.status === 'processing' || u.status === 'uploaded')
                  .map((upload) => (
                    <div key={upload.id} className="card p-4 flex items-center gap-4">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{upload.file_name}</p>
                        <p className="text-sm text-gray-500">Extracting bid information...</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Empty State */}
            {bids.length === 0 && pdfUploads.filter(u => u.status !== 'extracted').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Upload your first contractor bid PDF to get started</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <BidComparisonTable 
            projectId={projectId!}
            bids={bids}
          />
        )}

        {activeTab === 'questions' && (
          <ContractorQuestions 
            projectId={projectId!}
            bids={bids}
          />
        )}

        {activeTab === 'checklist' && (
          <QIIChecklist projectId={projectId!} />
        )}
      </div>
    </div>
  );
}
