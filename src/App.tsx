import { useState, useEffect } from 'react';
import { useUser } from './hooks/useUser';
import { UnifiedHomePage } from './components/UnifiedHomePage';
import { BidSmartFlow } from './components/BidSmartFlow';

const ACTIVE_PROJECT_KEY = 'bidsmart_active_project';

function getStoredProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

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

function App() {
  const { user, loading, error } = useUser();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showHome, setShowHome] = useState(true);

  useEffect(() => {
    const storedProjectId = getStoredProjectId();
    if (storedProjectId) {
      setActiveProjectId(storedProjectId);
      setShowHome(false);
    }
  }, []);

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setStoredProjectId(projectId);
    setShowHome(false);
  };

  const handleStartProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setStoredProjectId(projectId);
    setShowHome(false);
  };

  const handleNavigateHome = () => {
    setActiveProjectId(null);
    setStoredProjectId(null);
    setShowHome(true);
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

  if (showHome || !activeProjectId) {
    return (
      <UnifiedHomePage
        user={user}
        onSelectProject={handleSelectProject}
        onStartProject={handleStartProject}
      />
    );
  }

  return <BidSmartFlow user={user} projectId={activeProjectId} onNavigateHome={handleNavigateHome} />;
}

export default App;
