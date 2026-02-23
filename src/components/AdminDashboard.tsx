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
  CheckCircle2
} from 'lucide-react';
import { 
  getAdminStats, 
  getFeatureUsageStats, 
  getUserFeedback,
  listAllProjects,
  listFailedProjects,
  deleteProjectsBatch,
  type AdminStats,
  type FeatureUsageStat,
  type UserFeedback,
  type AdminProject
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'feedback' | 'cleanup'>('overview');
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

  useEffect(() => {
    if (activeTab === 'cleanup') {
      loadProjects();
    }
  }, [activeTab, showAllProjects]);

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
          <div className="flex gap-1">
            {(['overview', 'features', 'feedback', 'cleanup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-switch-green-600 text-switch-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
