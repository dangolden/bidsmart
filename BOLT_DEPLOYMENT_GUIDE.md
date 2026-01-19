# BidSmart - Bolt Deployment Guide

## How This Works

**Bolt Database = Supabase.** When you build in Bolt, it automatically provisions a Supabase database for your project. You don't need to:
- Create a separate Supabase account
- Set up environment variables manually
- Configure database connections

Bolt handles all of this automatically. Later, you can "claim" the database in Supabase to manage it directly.

---

## STEP 1: Start a New Bolt Project

1. Go to **bolt.new**
2. Start a new chat with this prompt:

```
Create a React + TypeScript + Vite + Tailwind CSS project called BidSmart. 
This is a heat pump contractor bid comparison tool.

Use Bolt Database (Supabase) for the backend.
```

3. Let Bolt scaffold the initial project

---

## STEP 2: Upload the Codebase

Once Bolt creates the initial project structure, you'll replace/add files with the BidSmart codebase.

### Option A: Paste Files Directly (Recommended)

Tell Bolt in chat:

```
I have a complete codebase to upload. Let me paste the files one by one. 
Please replace/create each file exactly as I provide it.
```

Then paste files in this order:

**1. Configuration Files (paste these first):**
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `tailwind.config.js`
- `postcss.config.js`
- `index.html`

**2. Core Files:**
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`

**3. Types & Client:**
- `src/lib/types/index.ts`
- `src/lib/supabaseClient.ts`

**4. Services:**
- `src/lib/database/bidsmartService.ts`
- `src/lib/services/mindpalService.ts`
- `src/lib/services/comparisonService.ts`

**5. Components:**
- `src/components/Layout.tsx`
- `src/components/BidUploadZone.tsx`
- `src/components/BidCard.tsx`
- `src/components/BidComparisonTable.tsx`
- `src/components/ContractorQuestions.tsx`
- `src/components/QIIChecklist.tsx`

**6. Pages:**
- `src/pages/LandingPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/ProjectPage.tsx`

### Option B: Reference ZIP File

You can also tell Bolt:
```
I'm uploading a ZIP file with the complete BidSmart codebase. 
Please extract and use all files, maintaining the folder structure.
```

---

## STEP 3: Create the Database Schema

Once the code is in place, tell Bolt:

```
Now let's set up the database. Run this SQL migration to create all the tables:
```

Then paste the ENTIRE contents of `supabase/migrations/001_create_bidsmart_schema.sql`

**What this creates:**
- 12 tables (users, projects, bids, equipment, analysis, etc.)
- Enum types for statuses and categories
- Indexes for performance
- Row Level Security policies
- Auto-scoring triggers
- Seed data (rebate programs + QII checklist items)

Bolt will automatically run this against your Bolt Database.

---

## STEP 4: Create Storage Bucket for PDFs

Tell Bolt:

```
Create a storage bucket for PDF uploads. Run this SQL:

-- Create storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('bid-pdfs', 'bid-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload bid PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bid-pdfs');

-- Allow users to read their own uploads  
CREATE POLICY "Users can read own bid PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bid-pdfs');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own bid PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bid-pdfs');
```

---

## STEP 5: Test the Application

1. Click **Preview** in Bolt
2. You should see the BidSmart landing page
3. Enter your email to sign in (magic link auth)
4. Check your email and click the link
5. Create a new project
6. Try the different tabs

**Note:** PDF extraction won't work yet without MindPal configured, but you can:
- Upload PDFs (they'll store in Supabase storage)
- Manually create bids to test comparison
- Test the QII checklist
- See the questions feature

---

## STEP 6: Deploy to Production

1. In Bolt, click **Deploy**
2. Choose Netlify or Vercel
3. Follow the prompts
4. Note your production URL (you'll need it for MindPal callbacks)

---

## STEP 7: Claim Your Database in Supabase (Optional)

After deployment, you can claim your Bolt Database in Supabase for direct management:

1. Go to **supabase.com**
2. Sign in / create account
3. Look for "Claim Project" or check your projects list
4. Your Bolt project should appear
5. Once claimed, you can:
   - View/edit data directly
   - Run SQL queries
   - Set up Edge Functions
   - Configure auth providers
   - Monitor usage

---

## STEP 8: Configure MindPal Integration

### Give Your MindPal Developer These Files:
- `docs/MINDPAL_INTEGRATION.md` - Complete integration specification

### What They Need to Build:
1. MindPal workflow that accepts PDF URLs
2. AI extraction using the provided system prompt
3. Callback to your app with extracted JSON

### After MindPal is Ready:

Tell Bolt to add environment variables:
```
Add these environment variables:
VITE_MINDPAL_WEBHOOK_URL=https://api.mindpal.space/v1/workflows/YOUR_WORKFLOW_ID/trigger
VITE_MINDPAL_API_KEY=your-api-key
VITE_CALLBACK_BASE_URL=https://your-deployed-url.com
```

### Callback Handler

You'll need a serverless function to receive MindPal callbacks. Tell Bolt:

```
Create a Netlify function at netlify/functions/mindpal-callback.ts to handle 
MindPal webhook callbacks. It should:
1. Verify the request signature
2. Parse the extraction JSON
3. Update the pdf_uploads table status
4. Create/update the contractor_bid record
5. Create line_items and equipment records
```

---

## Troubleshooting

### "Cannot find module" errors
→ Make sure all files are created in the correct paths

### Database tables not found
→ Re-run the migration SQL

### Auth not working
→ Bolt Database includes Supabase Auth by default - should work automatically

### Styles look wrong
→ Ensure `tailwind.config.js` and `postcss.config.js` are in root directory

### Storage upload fails
→ Run the storage bucket SQL from Step 4

---

## File Checklist

Verify these files exist in Bolt:

```
✓ package.json
✓ vite.config.ts
✓ tsconfig.json
✓ tsconfig.node.json  
✓ tailwind.config.js
✓ postcss.config.js
✓ index.html
✓ src/main.tsx
✓ src/App.tsx
✓ src/index.css
✓ src/lib/types/index.ts
✓ src/lib/supabaseClient.ts
✓ src/lib/database/bidsmartService.ts
✓ src/lib/services/mindpalService.ts
✓ src/lib/services/comparisonService.ts
✓ src/components/Layout.tsx
✓ src/components/BidUploadZone.tsx
✓ src/components/BidCard.tsx
✓ src/components/BidComparisonTable.tsx
✓ src/components/ContractorQuestions.tsx
✓ src/components/QIIChecklist.tsx
✓ src/pages/LandingPage.tsx
✓ src/pages/DashboardPage.tsx
✓ src/pages/ProjectPage.tsx
✓ public/favicon.svg
```

---

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Create Bolt project | 1 min |
| 2 | Paste all code files | 10-15 min |
| 3 | Run database migration SQL | 2 min |
| 4 | Create storage bucket | 1 min |
| 5 | Test in preview | 5 min |
| 6 | Deploy | 2 min |
| 7 | Claim in Supabase (optional) | 2 min |
| 8 | Configure MindPal | Depends on MindPal dev |

**Total setup time: ~25 minutes** (not including MindPal integration)
