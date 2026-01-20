import { User } from 'lucide-react';
import type { UserExt } from '../lib/types';

interface UserIndicatorProps {
  user: UserExt;
  isReturningUser: boolean;
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export function UserIndicator({ user, isReturningUser }: UserIndicatorProps) {
  const displayName = user.full_name || user.email.split('@')[0];
  const initials = getInitials(user.full_name, user.email);
  const greeting = isReturningUser ? 'Welcome back' : 'Hello';

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-switch-green-100 rounded-full flex items-center justify-center">
            {initials ? (
              <span className="text-sm font-medium text-switch-green-700">{initials}</span>
            ) : (
              <User className="w-4 h-4 text-switch-green-600" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {greeting}, <span className="font-medium text-gray-900">{displayName}</span>
            </span>
            {isReturningUser && (
              <span className="text-xs bg-switch-green-50 text-switch-green-700 px-2 py-0.5 rounded-full">
                Your projects are saved
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 hidden sm:block">{user.email}</span>
      </div>
    </div>
  );
}
