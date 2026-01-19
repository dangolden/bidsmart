import { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface BidUploadZoneProps {
  onUpload: (files: FileList) => void;
  uploading: boolean;
}

export function BidUploadZone({ onUpload, uploading }: BidUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
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
            <span>PDF files only • Multiple files supported</span>
          </div>
        </div>
      )}
    </div>
  );
}
