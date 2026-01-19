import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase, getOrCreateUserExt } from './lib/supabaseClient';
import type { UserExt } from './lib/types';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ProjectPage } from './pages/ProjectPage';
import { DashboardPage } from './pages/DashboardPage';

// Layout
import { Layout } from './components/Layout';

function App() {
  const [user, setUser] = useState<UserExt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userExt = await getOrCreateUserExt(session.user.id, session.user.email!);
          setUser(userExt);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userExt = await getOrCreateUserExt(session.user.id, session.user.email!);
        setUser(userExt);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage user={user} />} />
      
      {/* Protected routes */}
      <Route element={<Layout user={user} />}>
        <Route 
          path="/dashboard" 
          element={user ? <DashboardPage user={user} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/project/:projectId" 
          element={user ? <ProjectPage user={user} /> : <Navigate to="/" />} 
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
