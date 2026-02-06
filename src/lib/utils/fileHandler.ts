/**
 * File Handler Utilities for Base64 Document Handling
 * 
 * Converts files to Base64 for embedding directly in API requests,
 * eliminating the need for MindPal to fetch files from URLs.
 */

export interface Base64Document {
  filename: string;
  mimeType: string;
  content: string; // Base64 encoded content
  size: number;
}

/**
 * Convert a single file to Base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Result is "data:application/pdf;base64,XXXXX..."
      // We extract just the Base64 part after the comma
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a File to a Base64Document object ready for API submission
 */
export async function fileToBase64Document(file: File): Promise<Base64Document> {
  const content = await fileToBase64(file);
  return {
    filename: file.name,
    mimeType: file.type || 'application/pdf',
    content,
    size: file.size,
  };
}

/**
 * Convert multiple files to Base64Document array
 * Includes progress callback for UI updates
 */
export async function prepareDocumentsForUpload(
  files: File[],
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<Base64Document[]> {
  const documents: Base64Document[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);
    
    const doc = await fileToBase64Document(file);
    documents.push(doc);
  }
  
  return documents;
}

/**
 * Validate file before conversion
 * Returns error message if invalid, null if valid
 */
export function validateFileForBase64(file: File): string | null {
  // Max file size: 10MB (Base64 adds ~33% overhead, keeping within limits)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" is too large. Maximum size is 10MB.`;
  }
  
  // Allowed file types
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];
  
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
    return `File "${file.name}" is not a supported format. Please upload PDF or Word documents.`;
  }
  
  return null;
}

/**
 * Calculate total payload size for Base64 documents
 * Base64 encoding adds approximately 33% overhead
 */
export function estimateBase64PayloadSize(files: File[]): number {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  // Base64 adds ~33% overhead
  return Math.ceil(totalBytes * 1.33);
}

/**
 * Check if files will fit within payload limits
 */
export function checkPayloadLimits(files: File[]): { valid: boolean; message?: string } {
  const estimatedSize = estimateBase64PayloadSize(files);
  
  // Supabase Edge Functions have a 6MB request body limit
  // MindPal may have its own limits - being conservative with 5MB
  const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;
  
  if (estimatedSize > MAX_PAYLOAD_SIZE) {
    const sizeMB = (estimatedSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      message: `Combined file size (~${sizeMB}MB) exceeds the 5MB limit. Please upload smaller files.`,
    };
  }
  
  return { valid: true };
}
