import { useState, useEffect } from 'react';
import { useUser } from './hooks/useUser';
import { UnifiedHomePage } from './components/UnifiedHomePage';
import { ResultsView } from './components/results/ResultsView';
import { ProcessingBanner } from './components/ProcessingBanner';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin, getStoredAdminSession, clearAdminSession, type AdminUser } from './components/AdminLogin';
import { supabase } from './lib/supabaseClient';

const ACTIVE_PROJECT_KEY = 'bidsmart_active_project';
const PROCESSING_PROJECT_KEY = 'bidsmart_processing_project';

function setStoredProjectId(projectId: string | null): void {
  try {
    if (projectId) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch {
  }
}

interface ProcessingProject {
  id: string;
  email?: string;
}

function App() {
  const { user, loading, error } = useUser();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [processingProject, setProcessingProject] = useState<ProcessingProject | null>(null);
  const [showWaitingFor, setShowWaitingFor] = useState<ProcessingProject | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getStoredAdminSession());

  // Initialize state based on URL path
  const initialPath = window.location.pathname;
  const [showAdmin, setShowAdmin] = useState(initialPath === '/admin');
  const [showHome, setShowHome] = useState(initialPath !== '/admin');

  // Handle deep link URL params: ?project_id=xxx&email=yyy
  // This lets completion emails link directly to the report
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const deepLinkProjectId = params.get('project_id');

    if (deepLinkProjectId) {
      // Validate the project exists before navigating
      const validateAndNavigate = async () => {
        try {
          const { data: project } = await supabase
            .from('projects')
            .select('id, status')
            .eq('id', deepLinkProjectId)
            .maybeSingle();

          if (project) {
            handleSelectProject(deepLinkProjectId);
            // Clean up URL params so they don't persist on refresh
            window.history.replaceState({}, '', '/');
          }
        } catch {
          // Silently fail — user will just see the homepage
        }
      };
      validateAndNavigate();
    }
  }, [user]);

  // Restore active project from localStorage on page refresh
  useEffect(() => {
    if (!user) return;
    if (activeProjectId) return; // Already set (e.g., from deep link)

    // Don't restore if there's a deep link — let that handler take precedence
    const params = new URLSearchParams(window.location.search);
    if (params.get('project_id')) return;

    const stored = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!stored) return;

    const restoreProject = async () => {
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('id, status')
          .eq('id', stored)
          .maybeSingle();

        if (project && project.status !== 'draft' && project.status !== 'cancelled') {
          setActiveProjectId(stored);
          setShowHome(false);
        } else {
          localStorage.removeItem(ACTIVE_PROJECT_KEY);
        }
      } catch {
        // If validation fails, clear stale stored ID and stay on homepage
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
    };
    restoreProject();
  }, [user]);

  // Check for processing project in localStorage and verify it's still active
  useEffect(() => {
    const checkProcessingProject = async () => {
      try {
        const stored = localStorage.getItem(PROCESSING_PROJECT_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored) as ProcessingProject;

        // Verify the project exists and hasn't been cancelled
        const { data: project } = await supabase
          .from('projects')
          .select('id, status, notification_email')
          .eq('id', parsed.id)
          .single();

        if (project && project.status !== 'cancelled' && project.status !== 'draft') {
          // Keep the processing banner active — it polls for completion itself
          setProcessingProject({
            id: project.id,
            email: project.notification_email,
          });
        } else {
          // Project doesn't exist or was cancelled, clear it
          localStorage.removeItem(PROCESSING_PROJECT_KEY);
          setProcessingProject(null);
        }
      } catch {
        // Ignore errors
      }
    };

    checkProcessingProject();
  }, []);

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setStoredProjectId(projectId);
    setShowHome(false);
    setShowWaitingFor(null);
  };

  const handleNavigateHome = () => {
    setActiveProjectId(null);
    setStoredProjectId(null);
    setShowHome(true);
    setShowAdmin(false);
    setShowWaitingFor(null);
    window.history.pushState({}, '', '/');
  };

  const handleViewResults = () => {
    if (!processingProject) return;
    const projectId = processingProject.id;
    setProcessingProject(null);
    localStorage.removeItem(PROCESSING_PROJECT_KEY);
    handleSelectProject(projectId);
  };

  const handleViewWaiting = () => {
    if (!processingProject) return;
    // Navigate to home and tell UnifiedHomePage to show waiting screen
    setActiveProjectId(null);
    setStoredProjectId(null);
    setShowHome(true);
    setShowAdmin(false);
    setShowWaitingFor(processingProject);
  };

  const handleDismissBanner = () => {
    setProcessingProject(null);
    localStorage.removeItem(PROCESSING_PROJECT_KEY);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-switch-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading BidSmart...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-600">!</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load</h1>
          <p className="text-gray-600 mb-4">
            There was a problem connecting to the database. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Admin dashboard (accessible via /admin with login)
  if (showAdmin) {
    if (!adminUser) {
      return <AdminLogin onLoginSuccess={(admin) => setAdminUser(admin)} />;
    }
    return (
      <AdminDashboard
        onBack={() => {
          clearAdminSession();
          setAdminUser(null);
          handleNavigateHome();
        }}
        userEmail={adminUser.email}
      />
    );
  }

  // Don't show processing banner if user is already viewing their processing project
  const showBanner = processingProject && activeProjectId !== processingProject.id;

  if (showHome || !activeProjectId) {
    return (
      <>
        {showBanner && (
          <ProcessingBanner
            projectId={processingProject.id}
            email={processingProject.email}
            onViewResults={handleViewResults}
            onViewWaiting={handleViewWaiting}
            onDismiss={handleDismissBanner}
          />
        )}
        <UnifiedHomePage
          user={user}
          onSelectProject={handleSelectProject}
          waitingForProject={showWaitingFor}
        />
      </>
    );
  }

  return (
    <>
      {showBanner && (
        <ProcessingBanner
          projectId={processingProject.id}
          email={processingProject.email}
          onViewResults={handleViewResults}
          onViewWaiting={handleViewWaiting}
          onDismiss={handleDismissBanner}
        />
      )}
      <ResultsView user={user} projectId={activeProjectId} onNavigateHome={handleNavigateHome} />
    </>
  );
}

export default App;
