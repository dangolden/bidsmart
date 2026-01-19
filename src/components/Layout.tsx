import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Zap, LogOut, Plus, LayoutDashboard } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { UserExt } from '../lib/types';

interface LayoutProps {
  user: UserExt | null;
}

export function Layout({ user }: LayoutProps) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-switch-green-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-xl text-gray-900">BidSmart</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              <Link 
                to="/dashboard" 
                className="btn btn-ghost text-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              
              {user && (
                <>
                  <span className="text-sm text-gray-500">{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="btn btn-ghost text-sm text-gray-500 hover:text-gray-700"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Zap className="w-4 h-4 text-switch-green-600" />
              <span>Powered by <a href="https://theswitchison.org" target="_blank" rel="noopener noreferrer" className="text-switch-green-600 hover:underline">TheSwitchIsOn.org</a></span>
            </div>
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} BidSmart
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
