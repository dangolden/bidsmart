/**
 * File Handler Utilities for Base64 Document Handling
 * 
 * Converts files to Base64 for embedding directly in API requests,
 * eliminating the need for MindPal to fetch files from URLs.
 */

export interface Base64Document {
  filename: string;
  mime_type: string;
  base64_content: string;
  size?: number;
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
    mime_type: file.type || 'application/pdf',
    base64_content: content,
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
  // Max file size: 20MB (Base64 adds ~33% overhead, keeping within limits)
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" is too large. Maximum size is 20MB.`;
  }
  
  // Allowed file types
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.gif'];
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
    return `File "${file.name}" is not a supported format. Please upload PDF, Word documents, or images (JPG, PNG, GIF).`;
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

/**
 * Validate Base64 encoding for QA testing
 * Logs detailed information about the encoding and attempts to decode
 * Returns validation results for inspection
 */
export async function validateBase64Encoding(file: File): Promise<{
  success: boolean;
  base64Length: number;
  originalSize: number;
  decodedSize?: number;
  firstChars: string;
  lastChars: string;
  error?: string;
}> {
  try {
    const base64 = await fileToBase64(file);
    
    console.group(`🔍 Base64 Validation: ${file.name}`);
    console.log('📄 Original file size:', file.size, 'bytes');
    console.log('📊 Base64 length:', base64.length, 'characters');
    console.log('📈 Overhead:', ((base64.length / file.size - 1) * 100).toFixed(1) + '%');
    console.log('🔤 First 50 chars:', base64.substring(0, 50));
    console.log('🔤 Last 50 chars:', base64.substring(base64.length - 50));
    
    // Try to decode it
    try {
      const decoded = atob(base64);
      console.log('✅ Decode successful!');
      console.log('📦 Decoded size:', decoded.length, 'bytes');
      console.log('🔍 First 100 chars of decoded:', decoded.substring(0, 100));
      console.log('🔍 Last 100 chars of decoded:', decoded.substring(decoded.length - 100));
      
      // Check if it looks like a PDF
      if (file.type === 'application/pdf') {
        const isPDF = decoded.startsWith('%PDF');
        console.log('📋 PDF header check:', isPDF ? '✅ Valid PDF header' : '❌ Missing PDF header');
      }
      
      console.groupEnd();
      
      return {
        success: true,
        base64Length: base64.length,
        originalSize: file.size,
        decodedSize: decoded.length,
        firstChars: base64.substring(0, 50),
        lastChars: base64.substring(base64.length - 50),
      };
    } catch (decodeError) {
      console.error('❌ Decode failed:', decodeError);
      console.groupEnd();
      
      return {
        success: false,
        base64Length: base64.length,
        originalSize: file.size,
        firstChars: base64.substring(0, 50),
        lastChars: base64.substring(base64.length - 50),
        error: decodeError instanceof Error ? decodeError.message : 'Decode failed',
      };
    }
  } catch (error) {
    console.error('❌ Base64 encoding failed:', error);
    return {
      success: false,
      base64Length: 0,
      originalSize: file.size,
      firstChars: '',
      lastChars: '',
      error: error instanceof Error ? error.message : 'Encoding failed',
    };
  }
}

/**
 * Export Base64 content to clipboard for external validation
 * Useful for pasting into LLMs to verify content extraction
 */
export async function exportBase64ToClipboard(file: File): Promise<void> {
  const base64 = await fileToBase64(file);
  await navigator.clipboard.writeText(base64);
  console.log(`✅ Base64 for "${file.name}" copied to clipboard (${base64.length} chars)`);
}
