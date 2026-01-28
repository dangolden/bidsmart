import { useState, useEffect } from 'react';
import { Play, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { getPublicDemoProjects, getBidCountByProject } from '../lib/database/bidsmartService';
import type { Project } from '../lib/types';

interface TryTheToolSectionProps {
  onSelectDemo: (projectId: string) => void;
}

interface DemoProject extends Project {
  bidCount?: number;
}

export function TryTheToolSection({ onSelectDemo }: TryTheToolSectionProps) {
  const [demos, setDemos] = useState<DemoProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemos();
  }, []);

  async function loadDemos() {
    try {
      const demoProjects = await getPublicDemoProjects();
      const demosWithCounts = await Promise.all(
        demoProjects.map(async (project) => {
          const bidCount = await getBidCountByProject(project.id);
          return { ...project, bidCount };
        })
      );
      setDemos(demosWithCounts);
    } catch (err) {
      console.error('Failed to load demo projects:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (demos.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <Play className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Don't Have Bids Ready?</h2>
          <p className="text-sm text-gray-600 mt-1">
            View a sample analysis and give us feedback
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {demos.map((demo) => (
          <button
            key={demo.id}
            onClick={() => onSelectDemo(demo.id)}
            className="w-full bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg p-3 flex items-center gap-3 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Play className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-medium text-gray-900 text-sm">{demo.project_name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700">
                  Demo
                </span>
              </div>
              {demo.bidCount !== undefined && demo.bidCount > 0 && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {demo.bidCount} {demo.bidCount === 1 ? 'bid' : 'bids'} to compare
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-teal-400 group-hover:text-teal-600 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
