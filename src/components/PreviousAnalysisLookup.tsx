import { useState } from 'react';
import { Search, FileText, Calendar, ChevronRight, AlertCircle, Loader2, Clock, CheckCircle2, X, Mail } from 'lucide-react';
import { getProjectsByNotificationEmail, getBidCountByProject } from '../lib/database/bidsmartService';
import type { Project } from '../lib/types';
import { formatDate } from '../lib/utils/formatters';

interface PreviousAnalysisLookupProps {
  onSelectProject: (projectId: string) => void;
  onClose: () => void;
}

interface ProjectWithBidCount extends Project {
  bidCount?: number;
}

export function PreviousAnalysisLookup({ onSelectProject, onClose }: PreviousAnalysisLookupProps) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [projects, setProjects] = useState<ProjectWithBidCount[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setSearching(true);
    setSearched(false);

    try {
      const foundProjects = await getProjectsByNotificationEmail(email.trim());

      const projectsWithCounts = await Promise.all(
        foundProjects.map(async (project) => {
          const bidCount = await getBidCountByProject(project.id);
          return { ...project, bidCount };
        })
      );

      setProjects(projectsWithCounts);
      setSearched(true);
    } catch (err) {
      console.error('Failed to search projects:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  function getStatusDisplay(status: string) {
    const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      draft: {
        label: 'Draft',
        icon: <FileText className="w-4 h-4" />,
        className: 'bg-gray-100 text-gray-600'
      },
      collecting_bids: {
        label: 'Gathering Bids',
        icon: <FileText className="w-4 h-4" />,
        className: 'bg-blue-100 text-blue-700'
      },
      analyzing: {
        label: 'Processing',
        icon: <Clock className="w-4 h-4 animate-pulse" />,
        className: 'bg-amber-100 text-amber-700'
      },
      comparing: {
        label: 'Ready to View',
        icon: <CheckCircle2 className="w-4 h-4" />,
        className: 'bg-switch-green-100 text-switch-green-700'
      },
      decided: {
        label: 'Decision Made',
        icon: <CheckCircle2 className="w-4 h-4" />,
        className: 'bg-switch-green-100 text-switch-green-700'
      },
      completed: {
        label: 'Completed',
        icon: <CheckCircle2 className="w-4 h-4" />,
        className: 'bg-gray-100 text-gray-600'
      },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  }

  function isProjectReady(status: string): boolean {
    return ['comparing', 'decided', 'completed'].includes(status);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900">Find Your Analysis</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Enter the email address you used when submitting your bids.
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="lookup-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="lookup-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
                  autoComplete="email"
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={searching}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Find My Analysis
                </>
              )}
            </button>
          </form>

          {searched && (
            <div className="mt-6">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-gray-900 font-medium mb-2">No analyses found</h3>
                  <p className="text-sm text-gray-600 max-w-xs mx-auto">
                    We could not find any analyses associated with this email address. Please check the spelling or try a different email.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Found {projects.length} {projects.length === 1 ? 'analysis' : 'analyses'}
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => onSelectProject(project.id)}
                        className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center gap-4 transition-colors text-left group"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isProjectReady(project.status) ? 'bg-switch-green-100' : 'bg-amber-100'
                        }`}>
                          {isProjectReady(project.status) ? (
                            <CheckCircle2 className="w-5 h-5 text-switch-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {project.project_name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {getStatusDisplay(project.status)}
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(project.created_at)}
                            </span>
                            {project.bidCount !== undefined && project.bidCount > 0 && (
                              <span className="text-xs text-gray-500">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
