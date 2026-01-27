import { useState, useEffect } from 'react';
import { FolderOpen, Calendar, FileText, ChevronRight, Play } from 'lucide-react';
import { getProjectsWithPublicDemos } from '../lib/database/bidsmartService';
import type { UserExt, Project } from '../lib/types';
import { DashboardPhasePreview } from './DashboardPhasePreview';

interface WelcomeScreenProps {
  user: UserExt;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (projectId: string) => void;
}

export function WelcomeScreen({ user, onSelectProject, onCreateProject }: WelcomeScreenProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [user.id]);

  async function loadProjects() {
    try {
      const allProjects = await getProjectsWithPublicDemos(user.id);
      setProjects(allProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewProject() {
    onCreateProject('new');
  }


  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
      collecting_bids: { label: 'Gathering Bids', className: 'bg-blue-100 text-blue-700' },
      analyzing: { label: 'Analyzing', className: 'bg-amber-100 text-amber-700' },
      comparing: { label: 'Comparing', className: 'bg-switch-green-100 text-switch-green-700' },
      decided: { label: 'Decision Made', className: 'bg-switch-green-100 text-switch-green-700' },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.className}`}>
        {config.label}
      </span>
    );
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">SwitchIsOn - Heat Pump Bid Compare Tool</h1>
          <p className="text-gray-600 max-w-2xl mx-auto mb-4">
            This is a beta tool we are piloting. Please upload your bids and provide feedback on the information presented, or view demo analyses of real bids that have been uploaded.
          </p>
          {user.email && (
            <p className="text-sm text-gray-500">
              {user.email === 'demo@theswitchison.org' ? (
                <>
                  <span className="font-medium">Demo Mode</span> - Explore the tool without signing up. Demo projects are available for everyone to view.
                </>
              ) : (
                <>
                  Signed in as <span className="font-medium">{user.email}</span>
                </>
              )}
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
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400">
            Powered by TheSwitchIsOn.org
          </p>
        </div>
      </div>
    </div>
  );
}
