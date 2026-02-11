import { useState, useEffect } from 'react';
import { useUser } from './hooks/useUser';
import { UnifiedHomePage } from './components/UnifiedHomePage';
import { BidSmartFlow } from './components/BidSmartFlow';
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
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getStoredAdminSession());
  
  // Initialize state based on URL path
  const initialPath = window.location.pathname;
  const [showAdmin, setShowAdmin] = useState(initialPath === '/admin');
  const [showHome, setShowHome] = useState(initialPath !== '/admin');

  // Check for processing project in localStorage and verify it's still processing
  useEffect(() => {
    const checkProcessingProject = async () => {
      try {
        const stored = localStorage.getItem(PROCESSING_PROJECT_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored) as ProcessingProject;
        
        // Verify the project is still in analyzing status
        const { data: project } = await supabase
          .from('projects')
          .select('id, status, notification_email')
          .eq('id', parsed.id)
          .single();

        if (project && (project.status === 'analyzing' || project.status === 'uploading')) {
          setProcessingProject({
            id: project.id,
            email: project.notification_email,
          });
        } else {
          // Project is no longer processing, clear it
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
  };

  const handleNavigateHome = () => {
    setActiveProjectId(null);
    setStoredProjectId(null);
    setShowHome(true);
    setShowAdmin(false);
    window.history.pushState({}, '', '/');
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

  if (showHome || !activeProjectId) {
    return (
      <UnifiedHomePage
        user={user}
        onSelectProject={handleSelectProject}
      />
    );
  }

  return <BidSmartFlow user={user} projectId={activeProjectId} onNavigateHome={handleNavigateHome} processingProject={processingProject} />;
}

export default App;
