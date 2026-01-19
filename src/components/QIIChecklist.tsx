import { useState, useEffect } from 'react';
import {
  ClipboardCheck, CheckCircle2, Circle, AlertTriangle, Info,
  ChevronDown, ChevronUp, Printer
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { QIIChecklistItem, ProjectQIIChecklist, QIICategory } from '../lib/types';

interface QIIChecklistProps {
  projectId: string;
}

interface ChecklistItemWithStatus extends QIIChecklistItem {
  status?: ProjectQIIChecklist;
}

const CATEGORY_INFO: Record<QIICategory, { label: string; description: string; icon: string }> = {
  pre_installation: {
    label: 'Pre-Installation',
    description: 'Verify these items before work begins',
    icon: '📋',
  },
  equipment: {
    label: 'Equipment Verification',
    description: 'Confirm the right equipment was delivered and installed',
    icon: '🔧',
  },
  airflow: {
    label: 'Airflow',
    description: 'Proper airflow is critical for efficiency and comfort',
    icon: '💨',
  },
  refrigerant: {
    label: 'Refrigerant',
    description: 'Correct refrigerant charge affects efficiency and equipment life',
    icon: '❄️',
  },
  electrical: {
    label: 'Electrical',
    description: 'Safe and proper electrical connections',
    icon: '⚡',
  },
  commissioning: {
    label: 'Commissioning & Closeout',
    description: 'Final steps to ensure everything is documented',
    icon: '✅',
  },
};

export function QIIChecklist({ projectId }: QIIChecklistProps) {
  const [items, setItems] = useState<ChecklistItemWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<QIICategory | null>('pre_installation');

  useEffect(() => {
    loadChecklist();
  }, [projectId]);

  async function loadChecklist() {
    // Load all checklist items
    const { data: allItems } = await supabase
      .from('qii_checklist_items')
      .select('*')
      .order('display_order', { ascending: true });

    // Load project-specific status
    const { data: projectStatus } = await supabase
      .from('project_qii_checklist')
      .select('*')
      .eq('project_id', projectId);

    // Merge status with items
    const statusMap = new Map(projectStatus?.map(s => [s.checklist_item_id, s]) || []);
    
    const itemsWithStatus = (allItems || []).map(item => ({
      ...item,
      status: statusMap.get(item.id),
    }));

    setItems(itemsWithStatus);
    setLoading(false);
  }

  async function toggleItem(item: ChecklistItemWithStatus) {
    const isCurrentlyVerified = item.status?.is_verified || false;

    if (item.status) {
      // Update existing status
      await supabase
        .from('project_qii_checklist')
        .update({ 
          is_verified: !isCurrentlyVerified,
          verified_at: !isCurrentlyVerified ? new Date().toISOString() : null,
          verified_by: !isCurrentlyVerified ? 'homeowner' : null,
        })
        .eq('id', item.status.id);
    } else {
      // Create new status
      await supabase
        .from('project_qii_checklist')
        .insert({
          project_id: projectId,
          checklist_item_id: item.id,
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: 'homeowner',
        });
    }

    // Reload to get updated data
    loadChecklist();
  }

  function getProgress() {
    const total = items.length;
    const verified = items.filter(i => i.status?.is_verified).length;
    const critical = items.filter(i => i.is_critical);
    const criticalVerified = critical.filter(i => i.status?.is_verified).length;

    return {
      total,
      verified,
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
      critical: critical.length,
      criticalVerified,
      criticalComplete: criticalVerified === critical.length,
    };
  }

  function getCategoryItems(category: QIICategory) {
    return items.filter(i => i.category === category);
  }

  function getCategoryProgress(category: QIICategory) {
    const categoryItems = getCategoryItems(category);
    const verified = categoryItems.filter(i => i.status?.is_verified).length;
    return { total: categoryItems.length, verified };
  }

  function handlePrint() {
    window.print();
  }

  const progress = getProgress();
  const categories = Object.keys(CATEGORY_INFO) as QIICategory[];

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading checklist...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-switch-green-50 to-blue-50 border border-switch-green-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-switch-green-600" />
              Quality Installation Checklist
            </h2>
            <p className="text-gray-600 mt-1">
              Use this checklist to verify your heat pump was installed correctly.
              Based on ACCA/ANSI Quality Installation standards.
            </p>
          </div>
          <button onClick={handlePrint} className="btn btn-secondary text-sm print:hidden">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>

        {/* Progress */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-gray-900">{progress.verified}/{progress.total}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{progress.percentage}% complete</p>
          </div>

          <div className={`rounded-lg p-4 ${progress.criticalComplete ? 'bg-green-50' : 'bg-amber-50'}`}>
            <div className="flex items-center gap-2">
              {progress.criticalComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <span className="font-medium text-gray-900">Critical Items</span>
            </div>
            <p className={`text-sm mt-1 ${progress.criticalComplete ? 'text-green-700' : 'text-amber-700'}`}>
              {progress.criticalVerified} of {progress.critical} critical items verified
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((category) => {
          const info = CATEGORY_INFO[category];
          const categoryProgress = getCategoryProgress(category);
          const isExpanded = expandedCategory === category;
          const categoryItems = getCategoryItems(category);
          const allVerified = categoryProgress.verified === categoryProgress.total;

          return (
            <div key={category} className="card overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{info.label}</h3>
                    <p className="text-sm text-gray-500">{info.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${allVerified ? 'text-green-600' : 'text-gray-500'}`}>
                    {categoryProgress.verified}/{categoryProgress.total}
                  </span>
                  {allVerified && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`checklist-item ${item.status?.is_verified ? 'verified' : ''} ${item.is_critical ? 'critical' : ''}`}
                    >
                      <button
                        onClick={() => toggleItem(item)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {item.status?.is_verified ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${item.status?.is_verified ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item.item_text}
                          </p>
                          {item.is_critical && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                              Critical
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        )}
                        {item.why_it_matters && (
                          <div className="mt-2 flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-2">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span><strong>Why it matters:</strong> {item.why_it_matters}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {progress.percentage === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-900">Installation Verified!</h3>
          <p className="text-green-700 mt-1">
            All quality installation items have been checked. Keep this checklist for your records.
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Tips for Using This Checklist</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-switch-green-600">•</span>
            Ask your contractor to walk through critical items with you before they leave
          </li>
          <li className="flex items-start gap-2">
            <span className="text-switch-green-600">•</span>
            Request documentation for items like load calculations and commissioning reports
          </li>
          <li className="flex items-start gap-2">
            <span className="text-switch-green-600">•</span>
            Take photos of equipment labels showing model numbers and serial numbers
          </li>
          <li className="flex items-start gap-2">
            <span className="text-switch-green-600">•</span>
            Don't sign off on the final payment until critical items are verified
          </li>
        </ul>
      </div>
    </div>
  );
}
