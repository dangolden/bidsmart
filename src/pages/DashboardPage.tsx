import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import * as db from '../lib/database/bidsmartService';
import type { UserExt, Project } from '../lib/types';

interface DashboardPageProps {
  user: UserExt;
  isReturningUser?: boolean;
}

export function DashboardPage({ user, isReturningUser = false }: DashboardPageProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [user.id]);

  async function loadProjects() {
    try {
      const data = await db.getProjectsByUser(user.id);
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject() {
    setCreating(true);
    try {
      const project = await db.createProject(user.id, {
        project_name: 'My Heat Pump Project',
        status: 'collecting_bids',
      });
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      setCreating(false);
    }
  }

  async function handleDeleteProject(projectId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }

    try {
      await db.deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      specifications: { label: 'Setting Up', className: 'bg-blue-100 text-blue-700' },
      collecting_bids: { label: 'Collecting Bids', className: 'bg-yellow-100 text-yellow-700' },
      analyzing: { label: 'Analyzing', className: 'status-processing' },
      comparing: { label: 'Ready to Compare', className: 'status-complete' },
      decided: { label: 'Decision Made', className: 'bg-green-100 text-green-700' },
      in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-700' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-switch-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-gray-600 mt-1">
            {isReturningUser && projects.length > 0
              ? 'Here are your saved bid comparisons'
              : 'Compare heat pump bids and make informed decisions'}
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          disabled={creating}
          className="btn btn-primary"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          New Project
        </button>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create your first project to start comparing heat pump bids from contractors.
          </p>
          <button
            onClick={handleCreateProject}
            disabled={creating}
            className="btn btn-primary"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="card p-6 hover:border-switch-green-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-switch-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-switch-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-switch-green-600 transition-colors">
                      {project.project_name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {getStatusBadge(project.status)}
                      <span className="text-sm text-gray-500">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-switch-green-600 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="bg-switch-green-50 border border-switch-green-200 rounded-xl p-6">
        <h3 className="font-semibold text-switch-green-900 mb-2">Tips for Getting Good Bids</h3>
        <ul className="text-sm text-switch-green-800 space-y-1">
          <li>• Get at least 3 bids to have a good basis for comparison</li>
          <li>• Ask contractors to provide detailed line-item pricing</li>
          <li>• Request equipment model numbers and efficiency ratings</li>
          <li>• Verify license numbers with your state licensing board</li>
        </ul>
      </div>
    </div>
  );
}
