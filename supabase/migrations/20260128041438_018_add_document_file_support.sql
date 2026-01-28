/*
  # Add Document File Support to Storage Bucket

  1. Changes
    - Update bid-pdfs bucket to accept Word documents (.doc, .docx)
    - Supports both PDF and Word document formats
    - Maintains 25MB file size limit

  2. Supported MIME Types
    - application/pdf (PDF files)
    - application/msword (.doc files)
    - application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx files)

  3. Notes
    - MindPal API must support document parsing for this to work end-to-end
    - If MindPal doesn't support documents, they will upload but extraction may fail
    - File size limit remains 25MB for all file types
*/

-- Update the storage bucket to allow document files
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
WHERE id = 'bid-pdfs';
