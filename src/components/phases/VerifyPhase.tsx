import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, AlertTriangle, Info, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';
import { supabase } from '../../lib/supabaseClient';
import type { QIIChecklistItem, ProjectQIIChecklist, QIICategory } from '../../lib/types';

interface ChecklistItemWithStatus extends QIIChecklistItem {
  status?: ProjectQIIChecklist;
}

const CATEGORY_INFO: Record<QIICategory, { label: string; description: string }> = {
  pre_installation: {
    label: 'Pre-Installation',
    description: 'Verify these items before work begins',
  },
  equipment: {
    label: 'Equipment Verification',
    description: 'Confirm the right equipment was delivered and installed',
  },
  airflow: {
    label: 'Airflow',
    description: 'Proper airflow is critical for efficiency and comfort',
  },
  refrigerant: {
    label: 'Refrigerant',
    description: 'Correct refrigerant charge affects efficiency and equipment life',
  },
  electrical: {
    label: 'Electrical',
    description: 'Safe and proper electrical connections',
  },
  commissioning: {
    label: 'Commissioning & Closeout',
    description: 'Final steps to ensure everything is documented',
  },
};

export function VerifyPhase() {
  const { projectId } = usePhase();
  const [items, setItems] = useState<ChecklistItemWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<QIICategory | null>('pre_installation');

  useEffect(() => {
    if (projectId) {
      loadChecklist();
    }
  }, [projectId]);

  async function loadChecklist() {
    const { data: allItems } = await supabase
      .from('qii_checklist_items')
      .select('*')
      .order('display_order', { ascending: true });

    const { data: projectStatus } = await supabase
      .from('project_qii_checklist')
      .select('*')
      .eq('project_id', projectId);

    const statusMap = new Map(projectStatus?.map((s) => [s.checklist_item_id, s]) || []);

    const itemsWithStatus = (allItems || []).map((item) => ({
      ...item,
      status: statusMap.get(item.id),
    }));

    setItems(itemsWithStatus);
    setLoading(false);
  }

  async function toggleItem(item: ChecklistItemWithStatus) {
    const isCurrentlyVerified = item.status?.is_verified || false;

    if (item.status) {
      await supabase
        .from('project_qii_checklist')
        .update({
          is_verified: !isCurrentlyVerified,
          verified_at: !isCurrentlyVerified ? new Date().toISOString() : null,
          verified_by: !isCurrentlyVerified ? 'homeowner' : null,
        })
        .eq('id', item.status.id);
    } else {
      await supabase.from('project_qii_checklist').insert({
        project_id: projectId,
        checklist_item_id: item.id,
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: 'homeowner',
      });
    }

    loadChecklist();
  }

  function getProgress() {
    const total = items.length;
    const verified = items.filter((i) => i.status?.is_verified).length;
    const critical = items.filter((i) => i.is_critical);
    const criticalVerified = critical.filter((i) => i.status?.is_verified).length;

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
    return items.filter((i) => i.category === category);
  }

  function getCategoryProgress(category: QIICategory) {
    const categoryItems = getCategoryItems(category);
    const verified = categoryItems.filter((i) => i.status?.is_verified).length;
    return { total: categoryItems.length, verified };
  }

  function handlePrint() {
    window.print();
  }

  const progress = getProgress();
  const categories = Object.keys(CATEGORY_INFO) as QIICategory[];

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-switch-green-600 mx-auto mb-4" />
        Loading checklist...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Installation</h1>
          <p className="text-gray-600 mt-1">
            Use this checklist to ensure your heat pump was installed correctly.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="btn btn-secondary flex items-center gap-2 print:hidden"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-gray-900">
                {progress.verified}/{progress.total}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-switch-green-600 transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{progress.percentage}% complete</p>
          </div>

          <div
            className={`rounded-lg p-4 ${progress.criticalComplete ? 'bg-switch-green-50' : 'bg-amber-50'
              }`}
          >
            <div className="flex items-center gap-2">
              {progress.criticalComplete ? (
                <CheckCircle2 className="w-5 h-5 text-switch-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <span className="font-medium text-gray-900">Critical Items</span>
            </div>
            <p
              className={`text-sm mt-1 ${progress.criticalComplete ? 'text-switch-green-700' : 'text-amber-700'
                }`}
            >
              {progress.criticalVerified} of {progress.critical} critical items verified
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => {
          const info = CATEGORY_INFO[category];
          const categoryProgress = getCategoryProgress(category);
          const isExpanded = expandedCategory === category;
          const categoryItems = getCategoryItems(category);
          const allVerified = categoryProgress.verified === categoryProgress.total;

          if (categoryItems.length === 0) return null;

          return (
            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{info.label}</h3>
                  <p className="text-sm text-gray-500">{info.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${allVerified ? 'text-switch-green-600' : 'text-gray-500'
                      }`}
                  >
                    {categoryProgress.verified}/{categoryProgress.total}
                  </span>
                  {allVerified && <CheckCircle2 className="w-5 h-5 text-switch-green-600" />}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 py-3 flex items-start gap-3 ${item.status?.is_verified ? 'bg-gray-50' : ''
                        }`}
                    >
                      <button onClick={() => toggleItem(item)} className="flex-shrink-0 mt-0.5">
                        {item.status?.is_verified ? (
                          <CheckCircle2 className="w-6 h-6 text-switch-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-medium ${item.status?.is_verified
                                ? 'text-gray-500 line-through'
                                : 'text-gray-900'
                              }`}
                          >
                            {item.item_text}
                          </p>
                          {item.is_critical && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
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
                            <span>
                              <strong>Why it matters:</strong> {item.why_it_matters}
                            </span>
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

      {progress.percentage === 100 && (
        <div className="bg-switch-green-50 border border-switch-green-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-switch-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-switch-green-900">Installation Verified!</h3>
          <p className="text-switch-green-700 mt-1">
            All quality installation items have been checked. Keep this checklist for your records.
          </p>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Tips for Using This Checklist</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-switch-green-600">1.</span>
            Ask your contractor to walk through critical items with you before they leave
          </li>
          <li className="flex items-start gap-2">
            <span className="text-switch-green-600">2.</span>
            Request documentation for items like load calculations and commissioning reports
          </li>
          <li className="flex items-start gap-2">
            <span className="text-switch-green-600">3.</span>
            Take photos of equipment labels showing model numbers and serial numbers
          </li>
          <li className="flex items-start gap-2">
            <span className="text-switch-green-600">4.</span>
            Do not sign off on the final payment until critical items are verified
          </li>
        </ul>
      </div>
    </div>
  );
}
