import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Users, Shield } from 'lucide-react';

interface BidUploadZoneProps {
  onUpload: (files: FileList) => void;
  uploading: boolean;
  dataSharingConsent?: boolean;
  onDataSharingConsentChange?: (consent: boolean) => void;
}

export function BidUploadZone({
  onUpload,
  uploading,
  dataSharingConsent = false,
  onDataSharingConsentChange
}: BidUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = ''; // Reset input
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-switch-blue-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-900">Uploading and analyzing...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a minute</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-switch-green-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-switch-green-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">
              Drop contractor bid PDFs here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileText className="w-4 h-4" />
              <span>PDF files only - Multiple files supported</span>
            </div>
          </div>
        )}
      </div>

      {onDataSharingConsentChange && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={dataSharingConsent}
                onChange={(e) => onDataSharingConsentChange(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-switch-green-600 focus:ring-switch-green-500 focus:ring-offset-0 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-switch-green-600" />
                <span className="font-medium text-gray-900 text-sm">
                  Help other homeowners by sharing anonymized bid data
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your pricing data helps others understand fair market rates in your area.
                All personal and contractor details are removed before sharing.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPrivacyDetails(!showPrivacyDetails);
                }}
                className="text-xs text-switch-green-600 hover:text-switch-green-700 mt-2 flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                {showPrivacyDetails ? 'Hide privacy details' : 'What data is shared?'}
              </button>

              {showPrivacyDetails && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-600">
                  <p className="font-medium text-gray-900 mb-2">Data that IS shared (anonymized):</p>
                  <ul className="list-disc list-inside space-y-1 mb-3">
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
                  <p className="mt-3 text-gray-500">
                    You can change this preference at any time in your project settings.
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
