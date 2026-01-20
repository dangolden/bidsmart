import { Outlet } from 'react-router-dom';
import { UserIndicator } from './UserIndicator';
import type { UserExt } from '../lib/types';

interface EmbeddedLayoutProps {
  user: UserExt;
  isReturningUser: boolean;
}

export function EmbeddedLayout({ user, isReturningUser }: EmbeddedLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <UserIndicator user={user} isReturningUser={isReturningUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-100 bg-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <span>Powered by</span>
            <a
              href="https://theswitchison.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src="/sio_logo.png"
                alt="The Switch Is On"
                className="h-4"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
