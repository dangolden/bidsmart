/*
  # Create Storage Bucket for PDF Uploads

  1. New Storage Bucket
    - `bid-pdfs` - Stores uploaded contractor bid PDF documents
    - Private bucket (not publicly accessible)
    - Files organized by project: bids/{project_id}/{filename}.pdf

  2. Security (RLS Policies)
    - Authenticated users can upload PDFs to their own projects
    - Authenticated users can read PDFs from their own projects
    - Authenticated users can delete PDFs from their own projects
    - Public demo projects are readable by all authenticated users

  3. Notes
    - Max file size enforcement is handled at application level (25MB)
    - Only PDF files are accepted (validated at application level)
    - Files use UUID naming to prevent conflicts
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bid-pdfs',
  'bid-pdfs',
  false,
  26214400, -- 25MB in bytes
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload to their own projects
CREATE POLICY "Users can upload PDFs to own projects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bid-pdfs'
  AND (storage.foldername(name))[1] = 'bids'
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = (storage.foldername(name))[2]::uuid
    AND projects.user_id = auth.uid()
  )
);

-- Policy: Authenticated users can read PDFs from their own projects or public demos
CREATE POLICY "Users can read PDFs from own projects or demos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bid-pdfs'
  AND (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = (storage.foldername(name))[2]::uuid
      AND (projects.user_id = auth.uid() OR projects.is_public_demo = true)
    )
  )
);

-- Policy: Authenticated users can update PDFs in their own projects
CREATE POLICY "Users can update PDFs in own projects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bid-pdfs'
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = (storage.foldername(name))[2]::uuid
    AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'bid-pdfs'
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = (storage.foldername(name))[2]::uuid
    AND projects.user_id = auth.uid()
  )
);

-- Policy: Authenticated users can delete PDFs from their own projects
CREATE POLICY "Users can delete PDFs from own projects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bid-pdfs'
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = (storage.foldername(name))[2]::uuid
    AND projects.user_id = auth.uid()
  )
);