import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type {
  Project,
  ContractorBid,
  BidEquipment,
  BidScope,
  BidContractor,
  BidScore,
  ProjectRequirements,
  BidQuestion,
  BidConfiguration,
  ResultsTab,
  AnalysisStatus,
} from '../lib/types';
import {
  createProject,
  getProject,
  getProjectsWithPublicDemos,
  getBidsByProject,
  getEquipmentByBid,
  getProjectRequirements,
  getBidScope,
  getBidContractor,
  getBidScore,
} from '../lib/database/bidsmartService';
import { supabase } from '../lib/supabaseClient';

interface BidWithEquipment {
  bid: ContractorBid;
  equipment: BidEquipment[];
  scope?: BidScope | null;
  contractor?: BidContractor | null;
  scores?: BidScore | null;
}

interface ProjectState {
  projectId: string | null;
  project: Project | null;
  bids: BidWithEquipment[];
  configurations: BidConfiguration[];
  requirements: ProjectRequirements | null;
  questions: BidQuestion[];
  questionsLoading: boolean;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  activeTab: ResultsTab;
  analysisStatus: AnalysisStatus;
}

interface ProjectContextValue extends ProjectState {
  setActiveTab: (tab: ResultsTab) => void;
  refreshBids: () => Promise<void>;
  refreshRequirements: () => Promise<void>;
  refreshQuestions: () => Promise<void>;
  ensureProjectExists: () => Promise<string>;
  analyzedBidCount: number;
  totalBidCount: number;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const TAB_STORAGE_KEY = 'bidsmart_active_tab';

function loadStoredTab(): ResultsTab | null {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    if (stored) return stored as ResultsTab;
  } catch {
  }
  return null;
}

function saveStoredTab(tab: ResultsTab): void {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
  }
}

function deriveAnalysisStatus(project: Project | null, bids: BidWithEquipment[]): AnalysisStatus {
  if (!project) return 'processing';

  const status = project.status;

  if (status === 'comparing' || status === 'completed') return 'complete';
  if (status === 'cancelled') return 'failed';

  // Check for partial — some bids have scope data but not all
  if (bids.length > 0) {
    const bidsWithScope = bids.filter(b => !!b.scope);
    if (bidsWithScope.length > 0 && bidsWithScope.length < bids.length) {
      return 'partial';
    }
  }

  // Check for timeout — if queued more than 10 minutes ago
  if (project.analysis_queued_at) {
    const queuedAt = new Date(project.analysis_queued_at).getTime();
    const tenMinutesMs = 10 * 60 * 1000;
    if (Date.now() - queuedAt > tenMinutesMs && status === 'analyzing') {
      return 'timeout';
    }
  }

  return 'processing';
}

interface ProjectProviderProps {
  children: ReactNode;
  userId: string;
  projectId: string;
}

export function ProjectProvider({ children, userId, projectId: initialProjectId }: ProjectProviderProps) {
  const [state, setState] = useState<ProjectState>({
    projectId: null,
    project: null,
    bids: [],
    configurations: [],
    requirements: null,
    questions: [],
    questionsLoading: false,
    loading: true,
    error: null,
    isDemoMode: false,
    activeTab: loadStoredTab() || 'incentives',
    analysisStatus: 'processing',
  });

  useEffect(() => {
    async function initializeProject() {
      try {
        let project: Project | null = null;

        // Try fetching project from user's list first, then direct fetch
        const existingProjects = await getProjectsWithPublicDemos(userId);
        const foundProject = existingProjects.find(p => p.id === initialProjectId);

        if (foundProject) {
          project = foundProject;
          // If project list returned a stale status, do a fresh direct fetch
          if (project.status !== 'comparing' && project.status !== 'completed') {
            const freshProject = await getProject(initialProjectId);
            if (freshProject) project = freshProject;
          }
        } else {
          const directProject = await getProject(initialProjectId);
          if (directProject) {
            project = directProject;
          } else {
            throw new Error('Project not found');
          }
        }

        let bidsWithEquipment: BidWithEquipment[] = [];
        let requirements: ProjectRequirements | null = null;
        let questions: BidQuestion[] = [];
        let configurations: BidConfiguration[] = [];

        const bids = await getBidsByProject(initialProjectId);
        bidsWithEquipment = await Promise.all(
          bids.map(async (bid) => ({
            bid,
            equipment: await getEquipmentByBid(bid.id),
            scope: await getBidScope(bid.id).catch(() => null),
            contractor: await getBidContractor(bid.id).catch(() => null),
            scores: await getBidScore(bid.id).catch(() => null),
          }))
        );

        requirements = await getProjectRequirements(initialProjectId);

        const { data: questionsData } = await supabase
          .from('contractor_questions')
          .select('*')
          .in('bid_id', bids.map(b => b.id))
          .order('display_order', { ascending: true });

        questions = questionsData || [];

        // Fetch configurations
        const { data: configsData } = await supabase
          .from('bid_configurations')
          .select('*')
          .in('bid_id', bids.map(b => b.id))
          .order('config_index', { ascending: true });

        configurations = (configsData || []) as BidConfiguration[];

        const analysisStatus = deriveAnalysisStatus(project, bidsWithEquipment);

        setState({
          projectId: initialProjectId,
          project,
          bids: bidsWithEquipment,
          configurations,
          requirements,
          questions,
          questionsLoading: false,
          loading: false,
          error: null,
          isDemoMode: project?.is_public_demo ?? false,
          activeTab: loadStoredTab() || 'incentives',
          analysisStatus,
        });
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

  const setActiveTab = useCallback((tab: ResultsTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
    saveStoredTab(tab);
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

    // Also refresh configurations
    const { data: configsData } = await supabase
      .from('bid_configurations')
      .select('*')
      .in('bid_id', bids.map(b => b.id))
      .order('config_index', { ascending: true });

    setState(prev => {
      const analysisStatus = deriveAnalysisStatus(prev.project, bidsWithEquipment);
      return {
        ...prev,
        bids: bidsWithEquipment,
        configurations: (configsData || []) as BidConfiguration[],
        analysisStatus,
      };
    });
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

    return project.id;
  }, [state.projectId, userId]);

  // Background question polling — polls until questions arrive
  const bidIdsRef = useRef<string[]>([]);
  useEffect(() => {
    bidIdsRef.current = state.bids.map(b => b.bid.id);
  }, [state.bids]);

  useEffect(() => {
    if (!state.projectId || state.bids.length === 0) return;
    if (state.questions.length > 0) return;
    if (state.analysisStatus === 'failed') return;

    setState(prev => ({ ...prev, questionsLoading: true }));

    let attempts = 0;
    const maxAttempts = 60; // 5 minutes at 5s intervals

    const interval = setInterval(async () => {
      attempts++;
      const currentBidIds = bidIdsRef.current;
      if (currentBidIds.length === 0) return;

      try {
        const { data: questions } = await supabase
          .from('contractor_questions')
          .select('*')
          .in('bid_id', currentBidIds)
          .order('display_order', { ascending: true });

        if (questions && questions.length > 0) {
          setState(prev => ({
            ...prev,
            questions,
            questionsLoading: false,
          }));
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          setState(prev => ({ ...prev, questionsLoading: false }));
          clearInterval(interval);
        }
      } catch {
        if (attempts >= maxAttempts) {
          setState(prev => ({ ...prev, questionsLoading: false }));
          clearInterval(interval);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state.projectId, state.bids.length, state.questions.length, state.analysisStatus]);

  // Delayed bid re-fetch — picks up late-arriving enrichment data (contractor, scores)
  useEffect(() => {
    if (state.analysisStatus === 'failed') return;
    if (!state.projectId) return;

    const timer = setTimeout(() => {
      refreshBids();
    }, 15000);

    return () => clearTimeout(timer);
  }, [state.projectId]);

  const analyzedBidCount = state.bids.filter(b => !!b.scope).length;
  const totalBidCount = state.bids.length;

  const value: ProjectContextValue = {
    ...state,
    setActiveTab,
    refreshBids,
    refreshRequirements,
    refreshQuestions,
    ensureProjectExists,
    analyzedBidCount,
    totalBidCount,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
