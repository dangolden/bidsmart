import { useState, useEffect } from 'react';
import { FolderOpen, Calendar, FileText, ChevronRight } from 'lucide-react';
import { getProjectsByUser, getDemoProject, createProject, createBid, bulkCreateEquipment } from '../lib/database/bidsmartService';
import { SAMPLE_BIDS, SAMPLE_REBATE_PROGRAMS } from '../lib/services/sampleDataService';
import { supabase } from '../lib/supabaseClient';
import type { UserExt, Project } from '../lib/types';
import { DashboardPhasePreview } from './DashboardPhasePreview';

interface WelcomeScreenProps {
  user: UserExt;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (projectId: string) => void;
}

export function WelcomeScreen({ user, onSelectProject, onCreateProject }: WelcomeScreenProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [user.id]);

  async function loadProjects() {
    try {
      const userProjects = await getProjectsByUser(user.id);
      setProjects(userProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewProject() {
    try {
      const project = await createProject(user.id, {
        project_name: 'My Heat Pump Project',
        status: 'collecting_bids',
      });
      onCreateProject(project.id);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }

  async function handleLoadDemoData() {
    try {
      const existingDemo = await getDemoProject(user.id);

      if (existingDemo) {
        onCreateProject(existingDemo.id);
        return;
      }

      const project = await createProject(user.id, {
        project_name: 'Demo: Heat Pump Comparison',
        status: 'collecting_bids',
        heat_pump_type: 'air_source',
        system_size_tons: 3,
        is_demo: true,
      });

      await supabase.from('project_requirements').insert({
        project_id: project.id,
        priority_price: 4,
        priority_warranty: 3,
        priority_efficiency: 4,
        priority_timeline: 2,
        priority_reputation: 5,
        timeline_urgency: 'within_month',
        specific_concerns: ['Energy efficiency', 'Long-term reliability'],
        must_have_features: ['Variable speed compressor', 'Smart thermostat compatible'],
        nice_to_have_features: ['Low noise operation'],
        completed_at: new Date().toISOString(),
      });

      for (const sample of SAMPLE_BIDS) {
        const bid = await createBid(project.id, sample.bid);

        if (sample.equipment.length > 0) {
          await bulkCreateEquipment(bid.id, sample.equipment);
        }

        if (sample.questions.length > 0) {
          const questions = sample.questions.map((q, i) => ({
            bid_id: bid.id,
            ...q,
            display_order: i,
          }));
          await supabase.from('bid_questions').insert(questions);
        }
      }

      for (const rebate of SAMPLE_REBATE_PROGRAMS) {
        const { data: existingRebate } = await supabase
          .from('rebate_programs')
          .select('id')
          .eq('program_code', rebate.program_code)
          .maybeSingle();

        if (!existingRebate) {
          await supabase.from('rebate_programs').insert(rebate);
        }
      }

      onCreateProject(project.id);
    } catch (err: any) {
      if (err?.code === '23505') {
        const existingDemo = await getDemoProject(user.id);
        if (existingDemo) {
          onCreateProject(existingDemo.id);
          return;
        }
      }
      console.error('Failed to create demo project:', err);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
      collecting_bids: { label: 'Gathering Bids', className: 'bg-blue-100 text-blue-700' },
      analyzing: { label: 'Analyzing', className: 'bg-amber-100 text-amber-700' },
      comparing: { label: 'Comparing', className: 'bg-switch-green-100 text-switch-green-700' },
      decided: { label: 'Decision Made', className: 'bg-switch-green-100 text-switch-green-700' },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-switch-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to BidSmart</h1>
          <p className="text-gray-600">
            Compare heat pump bids with confidence.
          </p>
          {user.email && (
            <p className="text-sm text-gray-500 mt-2">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
          )}
        </div>

        <DashboardPhasePreview onStartProject={handleNewProject} onStartDemo={handleLoadDemoData} />

        {projects.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-gray-400" />
              Your Projects
            </h2>
            <div className="space-y-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {project.project_name}
                      </h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(project.created_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400">
            Powered by TheSwitchIsOn.org
          </p>
        </div>
      </div>
    </div>
  );
}
