import { useState, useEffect } from 'react';
import { Star, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ContractorReviewSurveyProps {
  projectId: string;
  contractorBidId: string;
  onSubmitSuccess?: () => void;
}

const ISSUE_OPTIONS = [
  'Delayed start date',
  'Project took longer than expected',
  'Additional costs not in original bid',
  'Equipment different than specified',
  'Lack of communication',
  'Quality concerns',
  'Cleanup issues',
  'Incomplete work',
  'Other',
];

export function ContractorReviewSurvey({
  projectId,
  contractorBidId,
  onSubmitSuccess,
}: ContractorReviewSurveyProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);

  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);

  const [usedChecklist, setUsedChecklist] = useState<boolean | null>(null);
  const [checklistCompletenessRating, setChecklistCompletenessRating] = useState(0);

  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [completedOnTime, setCompletedOnTime] = useState<boolean | null>(null);
  const [stayedWithinBudget, setStayedWithinBudget] = useState<boolean | null>(null);
  const [criticalItemsVerified, setCriticalItemsVerified] = useState<boolean | null>(null);
  const [photoDocumentationProvided, setPhotoDocumentationProvided] = useState<boolean | null>(null);

  const [issuesEncountered, setIssuesEncountered] = useState<string[]>([]);
  const [positiveComments, setPositiveComments] = useState('');
  const [improvementSuggestions, setImprovementSuggestions] = useState('');

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    loadExistingReview();
  }, [projectId]);

  async function loadExistingReview() {
    const { data } = await supabase
      .from('contractor_installation_reviews')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (data) {
      setExistingReview(data);
      setOverallRating(data.overall_rating);
      setQualityRating(data.quality_of_work_rating);
      setProfessionalismRating(data.professionalism_rating);
      setCommunicationRating(data.communication_rating);
      setTimelinessRating(data.timeliness_rating);
      setUsedChecklist(data.used_checklist);
      setChecklistCompletenessRating(data.checklist_completeness_rating || 0);
      setWouldRecommend(data.would_recommend);
      setCompletedOnTime(data.completed_on_time);
      setStayedWithinBudget(data.stayed_within_budget);
      setCriticalItemsVerified(data.critical_items_verified);
      setPhotoDocumentationProvided(data.photo_documentation_provided);
      setIssuesEncountered(data.issues_encountered || []);
      setPositiveComments(data.positive_comments || '');
      setImprovementSuggestions(data.improvement_suggestions || '');
      setSubmitted(true);
    }

    setLoading(false);
  }

  function validateForm(): boolean {
    const newErrors: string[] = [];

    if (!overallRating) newErrors.push('Overall rating is required');
    if (!qualityRating) newErrors.push('Quality rating is required');
    if (!professionalismRating) newErrors.push('Professionalism rating is required');
    if (!communicationRating) newErrors.push('Communication rating is required');
    if (!timelinessRating) newErrors.push('Timeliness rating is required');
    if (usedChecklist === null) newErrors.push('Please indicate if the contractor used the checklist');
    if (wouldRecommend === null) newErrors.push('Please indicate if you would recommend this contractor');
    if (completedOnTime === null) newErrors.push('Please indicate if the project was completed on time');
    if (stayedWithinBudget === null) newErrors.push('Please indicate if the project stayed within budget');
    if (criticalItemsVerified === null) newErrors.push('Please indicate if critical items were verified');
    if (photoDocumentationProvided === null) newErrors.push('Please indicate if photo documentation was provided');

    setErrors(newErrors);
    return newErrors.length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-contractor-review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            contractor_bid_id: contractorBidId,
            overall_rating: overallRating,
            quality_of_work_rating: qualityRating,
            professionalism_rating: professionalismRating,
            communication_rating: communicationRating,
            timeliness_rating: timelinessRating,
            used_checklist: usedChecklist,
            checklist_completeness_rating: usedChecklist && checklistCompletenessRating > 0 ? checklistCompletenessRating : null,
            would_recommend: wouldRecommend,
            completed_on_time: completedOnTime,
            stayed_within_budget: stayedWithinBudget,
            critical_items_verified: criticalItemsVerified,
            photo_documentation_provided: photoDocumentationProvided,
            issues_encountered: issuesEncountered,
            positive_comments: positiveComments.trim() || null,
            improvement_suggestions: improvementSuggestions.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit review');
      }

      setSubmitted(true);
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error: any) {
      setErrors([error.message || 'Failed to submit review. Please try again.']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownloadChecklist() {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contractor-checklist?project_id=${projectId}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-switch-green-600 mx-auto mb-4" />
        <p className="text-gray-500">Loading survey...</p>
      </div>
    );
  }

  if (submitted && !existingReview) {
    return (
      <div className="bg-switch-green-50 border border-switch-green-200 rounded-xl p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-switch-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-switch-green-900 mb-2">Thank You!</h2>
        <p className="text-switch-green-800 mb-4">
          Your review has been submitted successfully and will help other homeowners make informed decisions.
        </p>
        <p className="text-sm text-switch-green-700">
          Your feedback helps improve contractor quality standards and supports the TheSwitchIsOn community.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">Need the Quality Checklist?</h3>
          <p className="text-sm text-blue-800 mb-3">
            Download a printable quality installation checklist to review with your contractor.
          </p>
          <button
            type="button"
            onClick={handleDownloadChecklist}
            className="btn btn-secondary text-sm"
          >
            Download Checklist
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Experience</h2>

        <StarRating
          label="Overall Satisfaction"
          value={overallRating}
          onChange={setOverallRating}
          required
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Ratings</h2>
        <div className="space-y-6">
          <StarRating
            label="Quality of Work"
            description="Installation quality, attention to detail, workmanship"
            value={qualityRating}
            onChange={setQualityRating}
            required
          />
          <StarRating
            label="Professionalism"
            description="Conduct, appearance, respect for your property"
            value={professionalismRating}
            onChange={setProfessionalismRating}
            required
          />
          <StarRating
            label="Communication"
            description="Responsiveness, clarity, updates throughout the project"
            value={communicationRating}
            onChange={setCommunicationRating}
            required
          />
          <StarRating
            label="Timeliness"
            description="Punctuality, meeting deadlines, project duration"
            value={timelinessRating}
            onChange={setTimelinessRating}
            required
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quality Checklist Usage</h2>

        <YesNoQuestion
          label="Did the contractor use the quality installation checklist provided?"
          value={usedChecklist}
          onChange={setUsedChecklist}
          required
        />

        {usedChecklist && (
          <div className="mt-6 pl-4 border-l-4 border-switch-green-200">
            <StarRating
              label="How thoroughly did they complete the checklist?"
              value={checklistCompletenessRating}
              onChange={setChecklistCompletenessRating}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Project Outcomes</h2>
        <div className="space-y-6">
          <YesNoQuestion
            label="Would you recommend this contractor to others?"
            value={wouldRecommend}
            onChange={setWouldRecommend}
            required
          />
          <YesNoQuestion
            label="Was the project completed on time?"
            value={completedOnTime}
            onChange={setCompletedOnTime}
            required
          />
          <YesNoQuestion
            label="Did the final cost stay within the original budget?"
            description="No unexpected or unreasonable additional charges"
            value={stayedWithinBudget}
            onChange={setStayedWithinBudget}
            required
          />
          <YesNoQuestion
            label="Were all critical safety and quality items verified?"
            description="Equipment properly sized, electrical work up to code, system tested"
            value={criticalItemsVerified}
            onChange={setCriticalItemsVerified}
            required
          />
          <YesNoQuestion
            label="Did the contractor provide photo documentation of the installation?"
            description="Photos of equipment, electrical, ductwork, etc."
            value={photoDocumentationProvided}
            onChange={setPhotoDocumentationProvided}
            required
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Issues Encountered</h2>
        <p className="text-sm text-gray-600 mb-4">Select any issues you experienced (optional)</p>

        <div className="grid sm:grid-cols-2 gap-3">
          {ISSUE_OPTIONS.map((issue) => (
            <label key={issue} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={issuesEncountered.includes(issue)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setIssuesEncountered([...issuesEncountered, issue]);
                  } else {
                    setIssuesEncountered(issuesEncountered.filter((i) => i !== issue));
                  }
                }}
                className="w-4 h-4 text-switch-green-600 border-gray-300 rounded focus:ring-switch-green-500"
              />
              <span className="text-sm text-gray-700">{issue}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Feedback</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What went well? (optional)
            </label>
            <textarea
              value={positiveComments}
              onChange={(e) => setPositiveComments(e.target.value)}
              placeholder="Share what you appreciated about this contractor's work..."
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{positiveComments.length}/1000 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suggestions for improvement (optional)
            </label>
            <textarea
              value={improvementSuggestions}
              onChange={(e) => setImprovementSuggestions(e.target.value)}
              placeholder="Constructive feedback helps contractors improve their service..."
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-switch-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{improvementSuggestions.length}/1000 characters</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-gray-600">
          <span className="text-red-600">*</span> Required fields
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary flex items-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              {existingReview ? 'Update Review' : 'Submit Review'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function StarRating({
  label,
  description,
  value,
  onChange,
  required = false,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {description && <p className="text-sm text-gray-600 mb-3">{description}</p>}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none focus:ring-2 focus:ring-switch-green-500 rounded"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-300'
              } transition-colors`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm font-medium text-gray-700">
            {value} of 5 stars
          </span>
        )}
      </div>
    </div>
  );
}

function YesNoQuestion({
  label,
  description,
  value,
  onChange,
  required = false,
}: {
  label: string;
  description?: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {description && <p className="text-sm text-gray-600 mb-3">{description}</p>}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            value === true
              ? 'bg-switch-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            value === false
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
