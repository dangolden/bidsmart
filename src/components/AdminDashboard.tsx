import { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  FileText,
  ThumbsUp,
  Lightbulb,
  Bug,
  ArrowLeft,
  RefreshCw,
  Activity,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Mail,
  MailX,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  getAdminStats,
  getFeatureUsageStats,
  getUserFeedback,
  getSubmissions,
  filterSubmissions,
  listAllProjects,
  listFailedProjects,
  deleteProjectsBatch,
  getMarketDataStats,
  type AdminStats,
  type FeatureUsageStat,
  type UserFeedback,
  type AdminProject,
  type AdminSubmission,
  type SubmissionFilter,
  type CommunityBid
} from '../lib/services/adminService';

interface AdminDashboardProps {
  onBack: () => void;
  userEmail: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}

function StatCard({ title, value, subtitle, icon, trend, color = 'gray' }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/50 flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-medium">
            +{trend.value} {trend.label}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="text-xs opacity-75 mt-1">{subtitle}</div>}
    </div>
  );
}

export function AdminDashboard({ onBack, userEmail }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [featureStats, setFeatureStats] = useState<FeatureUsageStat[]>([]);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('all');
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'features' | 'feedback' | 'cleanup' | 'market'>('overview');
  const [marketData, setMarketData] = useState<CommunityBid[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, featureData, feedbackData] = await Promise.all([
        getAdminStats(),
        getFeatureUsageStats(),
        getUserFeedback(),
      ]);
      setStats(statsData);
      setFeatureStats(featureData);
      setFeedback(feedbackData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    const result = showAllProjects 
      ? await listAllProjects(userEmail)
      : await listFailedProjects(userEmail);
    if (result.success && result.projects) {
      setProjects(result.projects);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProjects.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedProjects.size} project(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteMessage(null);
    
    const result = await deleteProjectsBatch(Array.from(selectedProjects), userEmail);
    
    if (result.success) {
      setDeleteMessage({ type: 'success', text: result.message || 'Projects deleted successfully' });
      setSelectedProjects(new Set());
      await loadProjects();
    } else {
      setDeleteMessage({ type: 'error', text: result.message || 'Failed to delete projects' });
    }
    
    setDeleting(false);
  };

  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const selectAllProjects = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const loadSubmissions = async () => {
    const data = await getSubmissions();
    setSubmissions(data);
  };

  useEffect(() => {
    if (activeTab === 'submissions') {
      loadSubmissions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'cleanup') {
      loadProjects();
    }
  }, [activeTab, showAllProjects]);

  useEffect(() => {
    if (activeTab === 'market') {
      getMarketDataStats().then(setMarketData);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-switch-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">BidSmart Platform Analytics</p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {(['overview', 'submissions', 'features', 'feedback', 'cleanup', 'market'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-switch-green-600 text-switch-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'market' ? 'Market Data' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && stats && (
          <>
            {/* Key Metrics */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Runs"
                  value={stats.total_runs}
                  subtitle="Analyses started"
                  icon={<Activity className="w-5 h-5" />}
                  trend={{ value: stats.projects_24h, label: 'today' }}
                  color="green"
                />
                <StatCard
                  title="Total Bids Analyzed"
                  value={stats.total_bids}
                  subtitle={`${stats.unique_contractors} contractors`}
                  icon={<FileText className="w-5 h-5" />}
                  trend={{ value: stats.bids_24h, label: 'today' }}
                  color="blue"
                />
                <StatCard
                  title="PDFs Processed"
                  value={stats.total_pdfs}
                  subtitle={`${stats.extracted_pdfs} extracted, ${stats.failed_pdfs} failed`}
                  icon={<BarChart3 className="w-5 h-5" />}
                  color="amber"
                />
                <StatCard
                  title="Total Users"
                  value={stats.total_users}
                  subtitle={`${stats.active_users_7d} active this week`}
                  icon={<Users className="w-5 h-5" />}
                  color="gray"
                />
              </div>
            </div>

            {/* Project Status */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400">{stats.draft_projects}</div>
                  <div className="text-sm text-gray-600">Draft</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.analyzing_projects}</div>
                  <div className="text-sm text-gray-600">Analyzing</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.comparing_projects}</div>
                  <div className="text-sm text-gray-600">Comparing</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completed_projects}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.total_projects}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>
            </div>

            {/* User Feedback Summary */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">User Feedback Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-700">{stats.feedback_liked}</span>
                  </div>
                  <div className="text-sm text-green-700">Positive Feedback</div>
                </div>
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-700">{stats.feedback_wishlist}</span>
                  </div>
                  <div className="text-sm text-blue-700">Feature Requests</div>
                </div>
                <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Bug className="w-5 h-5 text-red-600" />
                    <span className="text-2xl font-bold text-red-700">{stats.feedback_bugs}</span>
                  </div>
                  <div className="text-sm text-red-700">Bug Reports</div>
                </div>
              </div>
            </div>

            {/* Homeowner Value Proposition */}
            <div className="bg-gradient-to-br from-switch-green-50 to-blue-50 rounded-xl border border-switch-green-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Data Helping Homeowners
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-switch-green-600 mb-2">
                    {stats.total_bids}
                  </div>
                  <div className="text-sm text-gray-700">
                    Contractor bids analyzed to build pricing intelligence
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-switch-green-600 mb-2">
                    {stats.unique_contractors}
                  </div>
                  <div className="text-sm text-gray-700">
                    Unique contractors in our database
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-switch-green-600 mb-2">
                    {stats.total_users}
                  </div>
                  <div className="text-sm text-gray-700">
                    Homeowners helped with bid comparisons
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'submissions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
                <p className="text-sm text-gray-500">Track all user submissions, errors, and notification status</p>
              </div>
              <button
                onClick={loadSubmissions}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {([
                { key: 'all' as SubmissionFilter, label: 'All', count: submissions.length },
                { key: 'awaiting_retry' as SubmissionFilter, label: 'Awaiting Retry', count: filterSubmissions(submissions, 'awaiting_retry').length },
                { key: 'failed' as SubmissionFilter, label: 'Failed', count: filterSubmissions(submissions, 'failed').length },
                { key: 'analyzing' as SubmissionFilter, label: 'Analyzing', count: filterSubmissions(submissions, 'analyzing').length },
                { key: 'completed' as SubmissionFilter, label: 'Completed', count: filterSubmissions(submissions, 'completed').length },
              ]).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setSubmissionFilter(key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    submissionFilter === key
                      ? key === 'awaiting_retry'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : key === 'failed'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-switch-green-100 text-switch-green-800 border border-switch-green-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {label}
                  <span className="ml-1.5 text-xs opacity-75">({count})</span>
                </button>
              ))}
            </div>

            {/* Awaiting retry banner */}
            {filterSubmissions(submissions, 'awaiting_retry').length > 0 && submissionFilter !== 'awaiting_retry' && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                <MailX className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium text-sm">
                    {filterSubmissions(submissions, 'awaiting_retry').length} user(s) were told "we're working on it" and are still waiting
                  </p>
                  <button
                    onClick={() => setSubmissionFilter('awaiting_retry')}
                    className="text-amber-700 text-xs underline mt-1"
                  >
                    View awaiting retry →
                  </button>
                </div>
              </div>
            )}

            {(() => {
              const filtered = filterSubmissions(submissions, submissionFilter);
              if (filtered.length === 0) {
                return (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No submissions match this filter.</p>
                  </div>
                );
              }

              return (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 w-8"></th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Project</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">User Email</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Bids</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Submitted</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Error Email</th>
                        <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Complete Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((sub) => {
                        const isExpanded = expandedSubmission === sub.id;
                        const hasFailed = sub.bids?.some((b) => b.status === 'failed');
                        return (
                          <>
                            <tr
                              key={sub.id}
                              onClick={() => setExpandedSubmission(isExpanded ? null : sub.id)}
                              className="hover:bg-gray-50 cursor-pointer"
                            >
                              <td className="px-4 py-3">
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                  : <ChevronRight className="w-4 h-4 text-gray-400" />
                                }
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {sub.project_name || 'Unnamed Project'}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">{sub.id.slice(0, 8)}...</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {sub.notification_email || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  sub.status === 'completed' || sub.status === 'comparing'
                                    ? 'bg-green-100 text-green-700'
                                    : sub.status === 'analyzing'
                                    ? 'bg-amber-100 text-amber-700'
                                    : sub.status === 'cancelled' || hasFailed
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {hasFailed && sub.status !== 'cancelled' ? `${sub.status} (has failures)` : sub.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-center">
                                {sub.bids?.length || 0}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {sub.analysis_queued_at
                                  ? new Date(sub.analysis_queued_at).toLocaleString()
                                  : new Date(sub.created_at).toLocaleDateString()
                                }
                              </td>
                              <td className="px-4 py-3 text-center">
                                {sub.error_notification_sent_at ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-700" title={new Date(sub.error_notification_sent_at).toLocaleString()}>
                                    <Mail className="w-3 h-3" />
                                    {new Date(sub.error_notification_sent_at).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {sub.notification_sent_at ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-700" title={new Date(sub.notification_sent_at).toLocaleString()}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    {new Date(sub.notification_sent_at).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${sub.id}-detail`}>
                                <td colSpan={8} className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-4 text-xs">
                                      <div>
                                        <span className="text-gray-500 font-medium">Created:</span>{' '}
                                        {new Date(sub.created_at).toLocaleString()}
                                      </div>
                                      <div>
                                        <span className="text-gray-500 font-medium">Updated:</span>{' '}
                                        {new Date(sub.updated_at).toLocaleString()}
                                      </div>
                                      <div>
                                        <span className="text-gray-500 font-medium">Notify opt-in:</span>{' '}
                                        {sub.notify_on_completion ? 'Yes' : 'No'}
                                      </div>
                                    </div>

                                    {sub.bids && sub.bids.length > 0 ? (
                                      <div>
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Bids</h4>
                                        <div className="space-y-1">
                                          {sub.bids.map((bid) => (
                                            <div
                                              key={bid.id}
                                              className={`flex items-center gap-3 text-xs px-3 py-2 rounded ${
                                                bid.status === 'failed'
                                                  ? 'bg-red-50 border border-red-100'
                                                  : bid.status === 'completed'
                                                  ? 'bg-green-50 border border-green-100'
                                                  : 'bg-white border border-gray-100'
                                              }`}
                                            >
                                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                bid.status === 'failed'
                                                  ? 'bg-red-500'
                                                  : bid.status === 'completed'
                                                  ? 'bg-green-500'
                                                  : 'bg-amber-400'
                                              }`} />
                                              <span className="font-medium">{bid.contractor_name || 'Unknown'}</span>
                                              <span className="text-gray-400">·</span>
                                              <span className={`${
                                                bid.status === 'failed' ? 'text-red-600' : 'text-gray-500'
                                              }`}>
                                                {bid.status}
                                              </span>
                                              <span className="font-mono text-gray-400 ml-auto">{bid.id.slice(0, 8)}</span>
                                              {bid.last_error && (
                                                <span className="text-red-500 truncate max-w-xs" title={bid.last_error}>
                                                  {bid.last_error}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500">No bids found for this project.</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'features' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h2>
            {featureStats.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No feature tracking data yet.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Events will appear here as users interact with features.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Event</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Category</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Total</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">24h</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">7d</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Sessions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {featureStats.map((feat, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{feat.event_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{feat.event_category || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">{feat.total_count}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">{feat.count_24h}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">{feat.count_7d}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right font-mono">{feat.unique_sessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Feedback</h2>
            {feedback.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <ThumbsUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No feedback submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg border p-4 ${
                      item.type === 'liked'
                        ? 'border-green-200'
                        : item.type === 'wishlist'
                        ? 'border-blue-200'
                        : 'border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.type === 'liked'
                            ? 'bg-green-100'
                            : item.type === 'wishlist'
                            ? 'bg-blue-100'
                            : 'bg-red-100'
                        }`}
                      >
                        {item.type === 'liked' && <ThumbsUp className="w-4 h-4 text-green-600" />}
                        {item.type === 'wishlist' && <Lightbulb className="w-4 h-4 text-blue-600" />}
                        {item.type === 'bug' && <Bug className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900">{item.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                          {item.url && <span className="truncate max-w-xs">{item.url}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cleanup' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Data Cleanup</h2>
                <p className="text-sm text-gray-500">Delete failed or test projects and their related data</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showAllProjects}
                    onChange={(e) => setShowAllProjects(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Show all projects
                </label>
                <button
                  onClick={loadProjects}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {deleteMessage && (
              <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
                deleteMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {deleteMessage.type === 'success' 
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <AlertTriangle className="w-5 h-5 text-red-600" />
                }
                <span className={deleteMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {deleteMessage.text}
                </span>
              </div>
            )}

            {selectedProjects.size > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                <span className="text-amber-800 font-medium">
                  {selectedProjects.size} project(s) selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            )}

            {projects.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  {showAllProjects ? 'No projects found.' : 'No failed or stuck projects found.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedProjects.size === projects.length && projects.length > 0}
                          onChange={selectAllProjects}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Project</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">PDFs</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Bids</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {projects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedProjects.has(project.id)}
                            onChange={() => toggleProjectSelection(project.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {project.project_name || 'Unnamed Project'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{project.id.slice(0, 8)}...</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            project.status === 'completed' ? 'bg-green-100 text-green-700' :
                            project.status === 'comparing' ? 'bg-blue-100 text-blue-700' :
                            project.status === 'analyzing' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {project.pdf_uploads?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {project.bids?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(project.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* ============ MARKET DATA TAB ============ */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Community Market Data</h2>

            {marketData.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                No community bid data yet. Data populates when users complete bids with data-sharing consent.
              </div>
            ) : (() => {
              // ---- Client-side aggregations ----
              const nonNull = (arr: (number | null | undefined)[]) =>
                arr.filter((v): v is number => v != null);

              const avg = (vals: number[]) =>
                vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;

              const uniqueStates = [...new Set(marketData.map(b => b.state).filter(Boolean))];
              const dates = marketData.map(b => b.bid_date || b.created_at).filter(Boolean).sort();
              const oldest = dates[0] ? new Date(dates[0]).toLocaleDateString() : '—';
              const newest = dates[dates.length - 1] ? new Date(dates[dates.length - 1]).toLocaleDateString() : '—';

              // Equipment type breakdown
              const byType = new Map<string, CommunityBid[]>();
              marketData.forEach(b => {
                const k = b.equipment_type || 'unknown';
                if (!byType.has(k)) byType.set(k, []);
                byType.get(k)!.push(b);
              });
              const equipRows = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

              const recent20 = marketData.slice(0, 20);

              return (
                <>
                  {/* Summary row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                      <div className="text-3xl font-bold text-switch-green-700">{marketData.length}</div>
                      <div className="text-sm text-gray-500 mt-1">Total Shared Bids</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                      <div className="text-3xl font-bold text-blue-700">{uniqueStates.length}</div>
                      <div className="text-sm text-gray-500 mt-1">Unique States</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                      <div className="text-xl font-bold text-gray-800">{oldest}</div>
                      <div className="text-sm text-gray-500 mt-1">Earliest Bid</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                      <div className="text-xl font-bold text-gray-800">{newest}</div>
                      <div className="text-sm text-gray-500 mt-1">Most Recent Bid</div>
                    </div>
                  </div>

                  {/* Equipment type breakdown */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">By Equipment Type</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">Count</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">Avg Total</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">Avg Labor</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">Avg Equip</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">Avg SEER</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {equipRows.map(([type, rows]) => {
                            const avgTotal = avg(nonNull(rows.map(r => r.total_bid_amount)));
                            const avgLabor = avg(nonNull(rows.map(r => r.labor_cost)));
                            const avgEquip = avg(nonNull(rows.map(r => r.equipment_cost)));
                            const avgSeer = avg(nonNull(rows.map(r => r.primary_seer_rating)));
                            const fmt = (n: number | null) => n != null ? `$${n.toLocaleString()}` : '—';
                            return (
                              <tr key={type} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900 capitalize">{type.replace(/_/g, ' ')}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{rows.length}</td>
                                <td className="px-4 py-3 text-right text-gray-700 font-medium">{fmt(avgTotal)}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{fmt(avgLabor)}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{fmt(avgEquip)}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{avgSeer != null ? avgSeer.toFixed(1) : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent entries */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Recent Entries <span className="text-sm font-normal text-gray-400">(last 20)</span></h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">State</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">ZIP Area</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-600">Permit</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-600">Elec</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-600">Duct</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-600">SEER</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {recent20.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {row.bid_date ? new Date(row.bid_date).toLocaleDateString() : new Date(row.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{row.state || '—'}</td>
                              <td className="px-4 py-3 text-gray-600 font-mono">{row.zip_code_area || '—'}</td>
                              <td className="px-4 py-3 text-gray-700 capitalize">{row.equipment_type?.replace(/_/g, ' ') || '—'}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-800">
                                {row.total_bid_amount != null ? `$${row.total_bid_amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="px-4 py-3 text-center">{row.includes_permit ? '✓' : '✗'}</td>
                              <td className="px-4 py-3 text-center">{row.includes_electrical ? '✓' : '✗'}</td>
                              <td className="px-4 py-3 text-center">{row.includes_ductwork ? '✓' : '✗'}</td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {row.primary_seer_rating != null ? row.primary_seer_rating.toFixed(1) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          {stats && (
            <span>
              Last updated: {new Date(stats.generated_at).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
