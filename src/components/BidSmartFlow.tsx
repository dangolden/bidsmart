import { PhaseProvider, usePhase } from '../context/PhaseContext';
import { PhaseLayout } from './PhaseLayout';
import { GatherPhase } from './phases/GatherPhase';
import { ComparePhase } from './phases/ComparePhase';
import { DecidePhase } from './phases/DecidePhase';
import { VerifyPhase } from './phases/VerifyPhase';
import type { UserExt } from '../lib/types';

interface BidSmartFlowProps {
  user: UserExt;
  projectId?: string;
}

function PhaseContent() {
  const { currentPhase, loading, error } = usePhase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-switch-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  switch (currentPhase) {
    case 1:
      return <GatherPhase />;
    case 2:
      return <ComparePhase />;
    case 3:
      return <DecidePhase />;
    case 4:
      return <VerifyPhase />;
    default:
      return <GatherPhase />;
  }
}

export function BidSmartFlow({ user, projectId }: BidSmartFlowProps) {
  return (
    <PhaseProvider userId={user.id} initialProjectId={projectId}>
      <PhaseLayout>
        <PhaseContent />
      </PhaseLayout>
    </PhaseProvider>
  );
}
