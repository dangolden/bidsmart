import { useState } from 'react';
import {
  DollarSign, Shield, Zap, Clock, Star,
  ChevronRight, Check, X, AlertCircle
} from 'lucide-react';
import * as db from '../lib/database/bidsmartService';
import type { ProjectRequirements, TimelineUrgency } from '../lib/types';

interface HomeownerQuestionnaireProps {
  projectId: string;
  bidCount: number;
  onComplete: (requirements: ProjectRequirements) => void;
  onSkip: () => void;
}

interface PriorityOption {
  id: keyof Pick<ProjectRequirements, 'priority_price' | 'priority_warranty' | 'priority_efficiency' | 'priority_timeline' | 'priority_reputation'>;
  label: string;
  description: string;
  icon: typeof DollarSign;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    id: 'priority_price',
    label: 'Low Price',
    description: 'Getting the best deal on total cost',
    icon: DollarSign
  },
  {
    id: 'priority_warranty',
    label: 'Warranty Coverage',
    description: 'Long-term protection and peace of mind',
    icon: Shield
  },
  {
    id: 'priority_efficiency',
    label: 'Energy Efficiency',
    description: 'Highest SEER/HSPF ratings for lower bills',
    icon: Zap
  },
  {
    id: 'priority_timeline',
    label: 'Quick Installation',
    description: 'Getting the work done fast',
    icon: Clock
  },
  {
    id: 'priority_reputation',
    label: 'Contractor Reputation',
    description: 'Highly rated, experienced installers',
    icon: Star
  },
];

const TIMELINE_OPTIONS: { value: TimelineUrgency; label: string; description: string }[] = [
  { value: 'flexible', label: 'Flexible', description: 'No rush, waiting for the right fit' },
  { value: 'within_month', label: 'Within a Month', description: 'Would like to start soon' },
  { value: 'within_2_weeks', label: 'Within 2 Weeks', description: 'Need it done fairly quickly' },
  { value: 'asap', label: 'ASAP', description: 'Current system has failed or urgent need' },
];

const CONCERN_OPTIONS = [
  'Noise levels of outdoor unit',
  'Upfront cost vs long-term savings',
  'Rebates and incentives',
  'Equipment brand preferences',
  'Electrical panel capacity',
  'Ductwork modifications needed',
  'Aesthetics of indoor/outdoor units',
  'Smart home integration',
];

const MUST_HAVE_OPTIONS = [
  'Variable speed compressor',
  'Smart/WiFi thermostat included',
  'Manual J load calculation',
  'All permits included',
  'Energy Star certified equipment',
  'Minimum 10-year parts warranty',
  'Same-day emergency service',
  'Financing options available',
];

type Step = 'priorities' | 'timeline' | 'concerns' | 'review';

export function HomeownerQuestionnaire({
  projectId,
  bidCount,
  onComplete,
  onSkip
}: HomeownerQuestionnaireProps) {
  const [step, setStep] = useState<Step>('priorities');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [priorities, setPriorities] = useState<Record<string, number>>({
    priority_price: 3,
    priority_warranty: 3,
    priority_efficiency: 3,
    priority_timeline: 3,
    priority_reputation: 3,
  });
  const [timelineUrgency, setTimelineUrgency] = useState<TimelineUrgency>('flexible');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  function handlePriorityChange(id: string, value: number) {
    setPriorities(prev => ({ ...prev, [id]: value }));
  }

  function toggleConcern(concern: string) {
    setConcerns(prev =>
      prev.includes(concern)
        ? prev.filter(c => c !== concern)
        : [...prev, concern]
    );
  }

  function toggleMustHave(feature: string) {
    setMustHaves(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    try {
      const requirements = await db.saveProjectRequirements(projectId, {
        priority_price: priorities.priority_price,
        priority_warranty: priorities.priority_warranty,
        priority_efficiency: priorities.priority_efficiency,
        priority_timeline: priorities.priority_timeline,
        priority_reputation: priorities.priority_reputation,
        timeline_urgency: timelineUrgency,
        specific_concerns: concerns,
        must_have_features: mustHaves,
        additional_notes: notes || undefined,
      });

      onComplete(requirements);
    } catch (err) {
      console.error('Error saving requirements:', err);
      setError('Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function getTopPriorities(): string[] {
    return Object.entries(priorities)
      .filter(([_, value]) => value >= 4)
      .map(([key]) => {
        const option = PRIORITY_OPTIONS.find(o => o.id === key);
        return option?.label || key;
      });
  }

  const steps: Step[] = ['priorities', 'timeline', 'concerns', 'review'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-switch-green-600 to-switch-green-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Help Us Compare Your {bidCount} Bid{bidCount !== 1 ? 's' : ''}
            </h2>
            <p className="text-switch-green-100 text-sm mt-1">
              Tell us what matters most so we can highlight the best options for you
            </p>
          </div>
          <button
            onClick={onSkip}
            className="text-switch-green-100 hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            Skip for now
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => i < currentStepIndex && setStep(s)}
                disabled={i > currentStepIndex}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  s === step
                    ? 'bg-switch-green-100 text-switch-green-700 font-medium'
                    : i < currentStepIndex
                    ? 'text-switch-green-600 hover:bg-switch-green-50 cursor-pointer'
                    : 'text-gray-400'
                }`}
              >
                {i < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">
                    {i + 1}
                  </span>
                )}
                <span className="hidden sm:inline">
                  {s === 'priorities' && 'Priorities'}
                  {s === 'timeline' && 'Timeline'}
                  {s === 'concerns' && 'Details'}
                  {s === 'review' && 'Review'}
                </span>
              </button>
              {i < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {step === 'priorities' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What's Most Important to You?
              </h3>
              <p className="text-gray-600 text-sm">
                Rate each factor from 1 (not important) to 5 (very important)
              </p>
            </div>

            <div className="space-y-4">
              {PRIORITY_OPTIONS.map((option) => (
                <div key={option.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <option.icon className="w-5 h-5 text-switch-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{option.label}</h4>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-16">Not important</span>
                    <div className="flex-1 flex items-center justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() => handlePriorityChange(option.id, value)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            priorities[option.id] === value
                              ? 'bg-switch-green-600 text-white shadow-md scale-105'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-switch-green-300'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">Very important</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'timeline' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                When Do You Need This Done?
              </h3>
              <p className="text-gray-600 text-sm">
                This helps us prioritize contractors who can meet your timeline
              </p>
            </div>

            <div className="grid gap-3">
              {TIMELINE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimelineUrgency(option.value)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    timelineUrgency === option.value
                      ? 'border-switch-green-500 bg-switch-green-50 ring-1 ring-switch-green-500'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${
                        timelineUrgency === option.value ? 'text-switch-green-700' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </h4>
                      <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
                    </div>
                    {timelineUrgency === option.value && (
                      <Check className="w-5 h-5 text-switch-green-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'concerns' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Any Specific Concerns or Requirements?
              </h3>
              <p className="text-gray-600 text-sm">
                Select any that apply (optional)
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Things you're concerned about:</h4>
              <div className="flex flex-wrap gap-2">
                {CONCERN_OPTIONS.map((concern) => (
                  <button
                    key={concern}
                    onClick={() => toggleConcern(concern)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      concerns.includes(concern)
                        ? 'bg-switch-green-100 text-switch-green-700 border border-switch-green-300'
                        : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {concerns.includes(concern) && <Check className="w-3 h-3 inline mr-1" />}
                    {concern}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Must-have features:</h4>
              <div className="flex flex-wrap gap-2">
                {MUST_HAVE_OPTIONS.map((feature) => (
                  <button
                    key={feature}
                    onClick={() => toggleMustHave(feature)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      mustHaves.includes(feature)
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {mustHaves.includes(feature) && <Check className="w-3 h-3 inline mr-1" />}
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Additional notes (optional):</h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any other details that would help us compare your bids..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Review Your Preferences
              </h3>
              <p className="text-gray-600 text-sm">
                We'll use these to highlight what matters most in your comparison
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Top Priorities</h4>
                <div className="flex flex-wrap gap-2">
                  {getTopPriorities().length > 0 ? (
                    getTopPriorities().map((p) => (
                      <span key={p} className="px-3 py-1 bg-switch-green-100 text-switch-green-700 rounded-full text-sm">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No strong priorities set (all rated 3 or below)</span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Timeline</h4>
                <p className="text-gray-900">
                  {TIMELINE_OPTIONS.find(t => t.value === timelineUrgency)?.label}
                </p>
              </div>

              {(concerns.length > 0 || mustHaves.length > 0) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Requirements</h4>
                  {concerns.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">Concerns: </span>
                      <span className="text-sm text-gray-700">{concerns.join(', ')}</span>
                    </div>
                  )}
                  {mustHaves.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Must-haves: </span>
                      <span className="text-sm text-gray-700">{mustHaves.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        {step !== 'priorities' ? (
          <button
            onClick={() => setStep(steps[currentStepIndex - 1])}
            className="btn btn-secondary"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step !== 'review' ? (
          <button
            onClick={() => setStep(steps[currentStepIndex + 1])}
            className="btn btn-primary"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? (
              <>
                <span className="animate-spin">...</span>
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save & View Comparison
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
