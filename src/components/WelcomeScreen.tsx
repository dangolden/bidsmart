import { useState, useEffect } from 'react';
import { FolderOpen, Calendar, FileText, ChevronRight, Play, Search, Clock, CheckCircle2 } from 'lucide-react';
import { getProjectsWithPublicDemos, getBidCountByProject } from '../lib/database/bidsmartService';
import type { UserExt, Project } from '../lib/types';
import { DashboardPhasePreview } from './DashboardPhasePreview';
import { PreviousAnalysisLookup } from './PreviousAnalysisLookup';
import { formatDate } from '../lib/utils/formatters';
import SwitchLogo from '../assets/switchlogo.svg';

interface ProjectWithBidCount extends Project {
  bidCount?: number;
}

interface WelcomeScreenProps {
  user: UserExt;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (projectId: string) => void;
}

export function WelcomeScreen({ user, onSelectProject, onCreateProject }: WelcomeScreenProps) {
  const [projects, setProjects] = useState<ProjectWithBidCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLookup, setShowLookup] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [user.id]);

  async function loadProjects() {
    try {
      const allProjects = await getProjectsWithPublicDemos(user.id);
      const projectsWithCounts = await Promise.all(
        allProjects.map(async (project) => {
          const bidCount = await getBidCountByProject(project.id);
          return { ...project, bidCount };
        })
      );
      setProjects(projectsWithCounts);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewProject() {
    onCreateProject('new');
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      draft: { label: 'Draft', icon: <FileText className="w-3 h-3" />, className: 'bg-gray-100 text-gray-600' },
      collecting_bids: { label: 'Gathering Bids', icon: <FileText className="w-3 h-3" />, className: 'bg-blue-100 text-blue-700' },
      analyzing: { label: 'Processing', icon: <Clock className="w-3 h-3 animate-pulse" />, className: 'bg-amber-100 text-amber-700' },
      comparing: { label: 'Ready', icon: <CheckCircle2 className="w-3 h-3" />, className: 'bg-switch-green-100 text-switch-green-700' },
      decided: { label: 'Decision Made', icon: <CheckCircle2 className="w-3 h-3" />, className: 'bg-switch-green-100 text-switch-green-700' },
      completed: { label: 'Completed', icon: <CheckCircle2 className="w-3 h-3" />, className: 'bg-gray-100 text-gray-600' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  }

  function handleLookupSelect(projectId: string) {
    setShowLookup(false);
    onSelectProject(projectId);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-switch-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <img src={SwitchLogo} alt="SwitchIsOn" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Heat Pump Bid Compare Tool <span className="text-base font-normal text-gray-500">(Beta)</span></h1>
          <p className="text-gray-600 max-w-2xl mx-auto mb-4">
            Please upload your bids and provide feedback on the information presented, or view demo analyses of real bids that have been uploaded.
          </p>
          {user.email && user.email !== 'demo@theswitchison.org' && (
            <p className="text-sm text-gray-500">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
          )}
        </div>

        <DashboardPhasePreview onStartProject={handleNewProject} />

        {projects.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-gray-400" />
              Your Projects
            </h2>
            <div className="space-y-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-all text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    project.is_public_demo ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {project.is_public_demo ? (
                      <Play className="w-5 h-5 text-red-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {project.project_name}
                      </h3>
                      {project.is_public_demo && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                          Demo
                        </span>
                      )}
                      {getStatusBadge(project.status)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(project.created_at)}
                      </span>
                      {project.bidCount !== undefined && project.bidCount > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {project.bidCount} {project.bidCount === 1 ? 'bid' : 'bids'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-gray-100 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Looking for a previous analysis?</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you submitted bids and provided your email, you can look up your analysis here.
            </p>
            <button
              onClick={() => setShowLookup(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Find My Analysis
            </button>
          </div>

          <div className="text-center pb-6 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Don't have bids ready? View a demo comparison of real bids.
            </p>
          </div>
          <p className="text-xs text-gray-400 text-center mt-6">
            Powered by TheSwitchIsOn.org
          </p>
        </div>

        {showLookup && (
          <PreviousAnalysisLookup
            onSelectProject={handleLookupSelect}
            onClose={() => setShowLookup(false)}
          />
        )}
      </div>
    </div>
  );
}
