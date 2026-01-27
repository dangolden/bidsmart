import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Plus, ArrowRight, Users, Shield } from 'lucide-react';
import { usePhase } from '../../context/PhaseContext';
import { saveProjectRequirements, updateProjectDataSharingConsent } from '../../lib/database/bidsmartService';

interface PrioritySliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  description: string;
}

function PrioritySlider({ label, value, onChange, description }: PrioritySliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">{value}/5</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-switch-green-600"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export function GatherPhase() {
  const { projectId, project, bids, requirements, completePhase, refreshRequirements, ensureProjectExists } = usePhase();

  const [priorities, setPriorities] = useState({
    price: requirements?.priority_price ?? 3,
    efficiency: requirements?.priority_efficiency ?? 3,
    warranty: requirements?.priority_warranty ?? 3,
    reputation: requirements?.priority_reputation ?? 3,
    timeline: requirements?.priority_timeline ?? 3,
  });

  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dataSharingConsent, setDataSharingConsent] = useState(project?.data_sharing_consent ?? false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  useEffect(() => {
    if (requirements) {
      setPriorities({
        price: requirements.priority_price ?? 3,
        efficiency: requirements.priority_efficiency ?? 3,
        warranty: requirements.priority_warranty ?? 3,
        reputation: requirements.priority_reputation ?? 3,
        timeline: requirements.priority_timeline ?? 3,
      });
    }
  }, [requirements]);

  useEffect(() => {
    if (project) {
      setDataSharingConsent(project.data_sharing_consent ?? false);
    }
  }, [project]);

  const readyBids = bids.filter(b =>
    b.bid.total_bid_amount > 0 && b.bid.contractor_name
  );

  const canContinue = readyBids.length >= 2;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    setSaving(true);
    try {
      const activeProjectId = projectId || await ensureProjectExists();

      await saveProjectRequirements(activeProjectId, {
        priority_price: priorities.price,
        priority_efficiency: priorities.efficiency,
        priority_warranty: priorities.warranty,
        priority_reputation: priorities.reputation,
        priority_timeline: priorities.timeline,
      });
      await updateProjectDataSharingConsent(activeProjectId, dataSharingConsent);
      await refreshRequirements();
      completePhase(1);
    } catch (err) {
      console.error('Failed to save requirements:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBidStatusIcon = (bid: typeof bids[0]) => {
    if (bid.bid.total_bid_amount > 0) {
      return <CheckCircle2 className="w-5 h-5 text-switch-green-600" />;
    }
    return <Clock className="w-5 h-5 text-amber-500" />;
  };

  const getBidStatusText = (bid: typeof bids[0]) => {
    if (bid.bid.total_bid_amount > 0) {
      return 'Ready';
    }
    return 'Processing';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gather Your Bids</h1>
        <p className="text-gray-600 mt-1">
          Upload at least 2 contractor bids to compare, then tell us what matters most to you.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-switch-green-600" />
          Upload Your Bids
        </h2>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-colors
            ${dragActive ? 'border-switch-green-500 bg-switch-green-50' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-2">Drag and drop PDF bid documents here</p>
          <p className="text-sm text-gray-400 mb-4">or</p>
          <button className="btn btn-secondary">
            Browse Files
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Supported formats: PDF (max 10MB each)
          </p>
        </div>

        {bids.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Uploaded Bids ({bids.length})</h3>
            {bids.map((item) => (
              <div
                key={item.bid.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.bid.contractor_name || item.bid.contractor_company || 'Unknown Contractor'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.bid.total_bid_amount > 0 ? formatCurrency(item.bid.total_bid_amount) : 'Processing...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${item.bid.total_bid_amount > 0 ? 'text-switch-green-600' : 'text-amber-500'}`}>
                    {getBidStatusText(item)}
                  </span>
                  {getBidStatusIcon(item)}
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-secondary w-full mt-4 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Add Another Bid
        </button>

        {bids.length < 2 && (
          <div className="mt-4 flex items-start gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              You need at least 2 bids to compare. {bids.length === 0 ? 'Upload your first bid to get started.' : 'Upload 1 more bid to continue.'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">What Matters Most to You?</h2>
        <p className="text-sm text-gray-600 mb-6">
          Adjust these sliders to reflect your priorities. We will use these to highlight the best options for you.
        </p>

        <div className="space-y-6">
          <PrioritySlider
            label="Upfront Cost"
            value={priorities.price}
            onChange={(v) => setPriorities(p => ({ ...p, price: v }))}
            description="How important is getting the lowest price?"
          />

          <PrioritySlider
            label="Energy Efficiency / Long-term Savings"
            value={priorities.efficiency}
            onChange={(v) => setPriorities(p => ({ ...p, efficiency: v }))}
            description="Higher efficiency means lower utility bills over time"
          />

          <PrioritySlider
            label="Warranty Length"
            value={priorities.warranty}
            onChange={(v) => setPriorities(p => ({ ...p, warranty: v }))}
            description="Longer warranties provide peace of mind"
          />

          <PrioritySlider
            label="Contractor Reputation"
            value={priorities.reputation}
            onChange={(v) => setPriorities(p => ({ ...p, reputation: v }))}
            description="Experience, reviews, and certifications"
          />

          <PrioritySlider
            label="Installation Timeline"
            value={priorities.timeline}
            onChange={(v) => setPriorities(p => ({ ...p, timeline: v }))}
            description="How quickly can they complete the work?"
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="pt-0.5">
            <input
              type="checkbox"
              checked={dataSharingConsent}
              onChange={(e) => setDataSharingConsent(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500 focus:ring-offset-0 cursor-pointer"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-switch-green-600" />
              <span className="font-medium text-gray-900">
                Help other homeowners by sharing anonymized bid data
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your pricing data helps others understand fair market rates in your area.
              All personal and contractor details are removed before sharing.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowPrivacyDetails(!showPrivacyDetails);
              }}
              className="text-sm text-switch-green-600 hover:text-switch-green-700 mt-2 flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              {showPrivacyDetails ? 'Hide privacy details' : 'What data is shared?'}
            </button>

            {showPrivacyDetails && (
              <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-2">Data that IS shared (anonymized):</p>
                <ul className="list-disc list-inside space-y-1 mb-4">
                  <li>Bid amounts and pricing breakdowns</li>
                  <li>Equipment types, efficiency ratings, and specifications</li>
                  <li>General location (ZIP code area only)</li>
                  <li>Project scope (system size, features included)</li>
                </ul>
                <p className="font-medium text-gray-900 mb-2">Data that is NEVER shared:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your name, email, or contact information</li>
                  <li>Your exact address</li>
                  <li>Contractor names or contact details</li>
                  <li>Original PDF documents</li>
                </ul>
                <p className="mt-4 text-gray-500 text-xs">
                  You can change this preference at any time in your project settings.
                </p>
              </div>
            )}
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="btn btn-primary flex items-center gap-2 px-6"
        >
          {saving ? 'Saving...' : 'Continue to Compare'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {!canContinue && (
        <p className="text-center text-sm text-gray-500">
          Upload at least 2 bids to continue
        </p>
      )}
    </div>
  );
}
