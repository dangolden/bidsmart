import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Project, ContractorBid, BidEquipment, BidScope, BidContractor, BidScore, ProjectRequirements, BidQuestion } from '../lib/types';
import {
  createProject,
  getProjectsWithPublicDemos,
  getBidsByProject,
  getEquipmentByBid,
  getProjectRequirements,
  getBidScope,
  getBidContractor,
  getBidScore,
} from '../lib/database/bidsmartService';
import { supabase } from '../lib/supabaseClient';

export type Phase = 1 | 2 | 3 | 4;
export type PhaseStatus = 'locked' | 'active' | 'completed';

const PHASE_LABELS: Record<Phase, string> = {
  1: 'GATHER',
  2: 'COMPARE',
  3: 'DECIDE',
  4: 'VERIFY',
};

interface BidWithEquipment {
  bid: ContractorBid;
  equipment: BidEquipment[];
  scope?: BidScope | null;
  contractor?: BidContractor | null;
  scores?: BidScore | null;
}

interface PhaseState {
  currentPhase: Phase;
  phaseStatus: Record<Phase, PhaseStatus>;
  projectId: string | null;
  project: Project | null;
  bids: BidWithEquipment[];
  requirements: ProjectRequirements | null;
  questions: BidQuestion[];
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
}

interface PhaseContextValue extends PhaseState {
  goToPhase: (phase: Phase) => void;
  completePhase: (phase: Phase) => void;
  canAccessPhase: (phase: Phase) => boolean;
  refreshBids: () => Promise<void>;
  refreshRequirements: () => Promise<void>;
  refreshQuestions: () => Promise<void>;
  getPhaseLabel: (phase: Phase) => string;
  ensureProjectExists: () => Promise<string>;
}

const PhaseContext = createContext<PhaseContextValue | null>(null);

const STORAGE_KEY = 'bidsmart_phase_state';

interface StoredPhaseState {
  currentPhase: Phase;
  projectId: string | null;
  phaseStatus: Record<Phase, PhaseStatus>;
}

function loadStoredState(): StoredPhaseState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
  }
  return null;
}

function saveStoredState(state: StoredPhaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

interface PhaseProviderProps {
  children: ReactNode;
  userId: string;
  initialProjectId?: string;
}

export function PhaseProvider({ children, userId, initialProjectId }: PhaseProviderProps) {
  const [state, setState] = useState<PhaseState>({
    currentPhase: 1,
    phaseStatus: {
      1: 'active',
      2: 'locked',
      3: 'locked',
      4: 'locked',
    },
    projectId: null,
    project: null,
    bids: [],
    requirements: null,
    questions: [],
    loading: true,
    error: null,
    isDemoMode: false,
  });

  useEffect(() => {
    async function initializeProject() {
      try {
        const storedState = loadStoredState();
        const existingProjects = await getProjectsWithPublicDemos(userId);

        let projectId: string | null = null;
        let project: Project | null = null;

        if (initialProjectId && initialProjectId !== 'new') {
          const foundProject = existingProjects.find(p => p.id === initialProjectId);
          if (foundProject) {
            projectId = initialProjectId;
            project = foundProject;
          } else {
            throw new Error('Project not found');
          }
        } else if (initialProjectId === 'new') {
          projectId = null;
          project = null;
        } else if (storedState?.projectId && existingProjects.find(p => p.id === storedState.projectId)) {
          projectId = storedState.projectId;
          project = existingProjects.find(p => p.id === storedState.projectId)!;
        } else if (existingProjects.length > 0) {
          project = existingProjects[0];
          projectId = project.id;
        }

        let bidsWithEquipment: BidWithEquipment[] = [];
        let requirements: ProjectRequirements | null = null;
        let questions: BidQuestion[] = [];

        if (projectId) {
          const bids = await getBidsByProject(projectId);
          bidsWithEquipment = await Promise.all(
            bids.map(async (bid) => ({
              bid,
              equipment: await getEquipmentByBid(bid.id),
              scope: await getBidScope(bid.id).catch(() => null),
              contractor: await getBidContractor(bid.id).catch(() => null),
              scores: await getBidScore(bid.id).catch(() => null),
            }))
          );

          requirements = await getProjectRequirements(projectId);

          const { data: questionsData } = await supabase
            .from('contractor_questions')
            .select('*')
            .in('bid_id', bids.map(b => b.id))
            .order('display_order', { ascending: true });

          questions = questionsData || [];
        }

        let currentPhase: Phase = 1;
        let phaseStatus: Record<Phase, PhaseStatus> = {
          1: 'active',
          2: 'locked',
          3: 'locked',
          4: 'locked',
        };

        if (storedState && storedState.projectId === projectId) {
          currentPhase = storedState.currentPhase;
          phaseStatus = storedState.phaseStatus;
        } else if (bidsWithEquipment.length >= 2 && requirements?.completed_at) {
          phaseStatus[1] = 'completed';
          phaseStatus[2] = 'active';
          phaseStatus[3] = 'active';
          phaseStatus[4] = 'active';
        }

        setState({
          currentPhase,
          phaseStatus,
          projectId,
          project,
          bids: bidsWithEquipment,
          requirements,
          questions: questions || [],
          loading: false,
          error: null,
          isDemoMode: project?.is_public_demo ?? false,
        });

        if (projectId) {
          saveStoredState({ currentPhase, projectId, phaseStatus });
        }
      } catch (err) {
        console.error('Failed to initialize project:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load project data',
        }));
      }
    }

    initializeProject();
  }, [userId, initialProjectId]);

  const canAccessPhase = useCallback((phase: Phase): boolean => {
    return state.phaseStatus[phase] !== 'locked';
  }, [state.phaseStatus]);

  const goToPhase = useCallback((phase: Phase) => {
    if (!canAccessPhase(phase)) return;

    setState(prev => {
      const newState = { ...prev, currentPhase: phase };
      saveStoredState({
        currentPhase: phase,
        projectId: prev.projectId,
        phaseStatus: prev.phaseStatus,
      });
      return newState;
    });
  }, [canAccessPhase]);

  const completePhase = useCallback((phase: Phase) => {
    setState(prev => {
      const newPhaseStatus = { ...prev.phaseStatus };
      newPhaseStatus[phase] = 'completed';

      if (phase === 1) {
        newPhaseStatus[2] = 'active';
        newPhaseStatus[3] = 'active';
        newPhaseStatus[4] = 'active';
      } else {
        const nextPhase = (phase + 1) as Phase;
        if (nextPhase <= 4 && newPhaseStatus[nextPhase] === 'locked') {
          newPhaseStatus[nextPhase] = 'active';
        }
      }

      const nextPhase = (phase + 1) as Phase;
      const newCurrentPhase = nextPhase <= 4 ? nextPhase : phase;

      saveStoredState({
        currentPhase: newCurrentPhase,
        projectId: prev.projectId,
        phaseStatus: newPhaseStatus,
      });

      return {
        ...prev,
        currentPhase: newCurrentPhase,
        phaseStatus: newPhaseStatus,
      };
    });
  }, []);

  const refreshBids = useCallback(async () => {
    if (!state.projectId) return;

    const bids = await getBidsByProject(state.projectId);
    const bidsWithEquipment = await Promise.all(
      bids.map(async (bid) => ({
        bid,
        equipment: await getEquipmentByBid(bid.id),
        scope: await getBidScope(bid.id).catch(() => null),
        contractor: await getBidContractor(bid.id).catch(() => null),
        scores: await getBidScore(bid.id).catch(() => null),
      }))
    );

    setState(prev => ({ ...prev, bids: bidsWithEquipment }));
  }, [state.projectId]);

  const refreshRequirements = useCallback(async () => {
    if (!state.projectId) return;

    const requirements = await getProjectRequirements(state.projectId);
    setState(prev => ({ ...prev, requirements }));
  }, [state.projectId]);

  const refreshQuestions = useCallback(async () => {
    if (!state.projectId || state.bids.length === 0) return;

    const { data: questions } = await supabase
      .from('contractor_questions')
      .select('*')
      .in('bid_id', state.bids.map(b => b.bid.id))
      .order('display_order', { ascending: true });

    setState(prev => ({ ...prev, questions: questions || [] }));
  }, [state.projectId, state.bids]);

  const getPhaseLabel = useCallback((phase: Phase): string => {
    return PHASE_LABELS[phase];
  }, []);

  const ensureProjectExists = useCallback(async (): Promise<string> => {
    if (state.projectId) {
      return state.projectId;
    }

    const project = await createProject(userId, {
      project_name: 'My Heat Pump Project',
      status: 'collecting_bids',
    });

    setState(prev => ({
      ...prev,
      projectId: project.id,
      project,
    }));

    saveStoredState({
      currentPhase: state.currentPhase,
      projectId: project.id,
      phaseStatus: state.phaseStatus,
    });

    return project.id;
  }, [state.projectId, state.currentPhase, state.phaseStatus, userId]);

  const value: PhaseContextValue = {
    ...state,
    goToPhase,
    completePhase,
    canAccessPhase,
    refreshBids,
    refreshRequirements,
    refreshQuestions,
    getPhaseLabel,
    ensureProjectExists,
  };

  return (
    <PhaseContext.Provider value={value}>
      {children}
    </PhaseContext.Provider>
  );
}

export function usePhase(): PhaseContextValue {
  const context = useContext(PhaseContext);
  if (!context) {
    throw new Error('usePhase must be used within a PhaseProvider');
  }
  return context;
}
