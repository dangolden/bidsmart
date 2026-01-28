import { useState } from 'react';
import { Search, FileText, Calendar, ChevronRight, AlertCircle, Loader2, Clock, CheckCircle2, Mail } from 'lucide-react';
import { getProjectsByNotificationEmail, getBidCountByProject } from '../lib/database/bidsmartService';
import type { Project } from '../lib/types';
import { formatDate } from '../lib/utils/formatters';

interface ReturningUserSectionProps {
  onSelectProject: (projectId: string) => void;
}

interface ProjectWithBidCount extends Project {
  bidCount?: number;
}

export function ReturningUserSection({ onSelectProject }: ReturningUserSectionProps) {
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
        icon: <FileText className="w-3.5 h-3.5" />,
        className: 'bg-gray-100 text-gray-600'
      },
      collecting_bids: {
        label: 'Gathering Bids',
        icon: <FileText className="w-3.5 h-3.5" />,
        className: 'bg-blue-100 text-blue-700'
      },
      analyzing: {
        label: 'Processing',
        icon: <Clock className="w-3.5 h-3.5 animate-pulse" />,
        className: 'bg-amber-100 text-amber-700'
      },
      comparing: {
        label: 'Ready to View',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        className: 'bg-switch-green-100 text-switch-green-700'
      },
      decided: {
        label: 'Decision Made',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        className: 'bg-switch-green-100 text-switch-green-700'
      },
      completed: {
        label: 'Completed',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        className: 'bg-gray-100 text-gray-600'
      },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  }

  function isProjectReady(status: string): boolean {
    return ['comparing', 'decided', 'completed'].includes(status);
  }

  function isProjectInProgress(status: string): boolean {
    return ['draft', 'collecting_bids', 'analyzing'].includes(status);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Search className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Retrieve Previous Bid Comparisons</h2>
          <p className="text-sm text-gray-600 mt-1">
            Have you compared bids before? Enter your email to pick up where you left off.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                if (searched) {
                  setSearched(false);
                  setProjects([]);
                }
              }}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent text-sm"
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="btn btn-secondary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find My Analysis
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}
      </form>

      {searched && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          {projects.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No analyses found</p>
              <p className="text-sm text-gray-600">
                We could not find any analyses for this email. Try a different email or start a new comparison below.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Found {projects.length} {projects.length === 1 ? 'analysis' : 'analyses'}
              </h3>
              <div className="space-y-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    className="w-full bg-gray-50 hover:bg-gray-100 rounded-lg p-3 flex items-center gap-3 transition-colors text-left group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isProjectReady(project.status)
                        ? 'bg-switch-green-100'
                        : isProjectInProgress(project.status)
                          ? 'bg-amber-100'
                          : 'bg-gray-100'
                    }`}>
                      {isProjectReady(project.status) ? (
                        <CheckCircle2 className="w-4 h-4 text-switch-green-600" />
                      ) : isProjectInProgress(project.status) ? (
                        <Clock className="w-4 h-4 text-amber-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-gray-900 text-sm truncate">
                          {project.project_name}
                        </span>
                        {getStatusDisplay(project.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(project.created_at)}
                        </span>
                        {project.bidCount !== undefined && project.bidCount > 0 && (
                          <span>{project.bidCount} {project.bidCount === 1 ? 'bid' : 'bids'}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
