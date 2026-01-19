# BidSmart - Heat Pump Bid Analysis Platform

**AI-powered bid comparison for TheSwitchIsOn.org**

BidSmart helps homeowners make informed decisions when comparing contractor bids for heat pump installations. Upload PDF bids, get AI-powered extraction and analysis, and receive recommendations with negotiation guidance.

## Features

- 📄 **PDF Bid Extraction** - Upload contractor bid PDFs and automatically extract structured data
- ⚖️ **Weighted Comparison** - Compare bids across price, efficiency, warranty, and more
- 🎯 **Smart Recommendations** - Get AI-generated recommendations based on your priorities
- 💰 **Rebate Tracking** - Identify applicable federal, state, and utility rebates
- ✉️ **Negotiation Assistance** - Generate negotiation emails and talking points
- 🚩 **Red Flag Detection** - Identify potential issues in contractor bids

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (via Bolt Database)
- **AI Extraction**: MindPal.space
- **Deployment**: Netlify/Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- Bolt Database project (or Supabase account)
- MindPal.space account (for PDF extraction)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/bidsmart-standalone.git
cd bidsmart-standalone
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

4. Run the database migration:
```bash
# In Supabase/Bolt SQL Editor, run:
# supabase/migrations/001_create_bidsmart_schema.sql
```

5. Start the development server:
```bash
npm run dev
```

## Architecture

```
bidsmart-standalone/
├── src/
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── lib/
│   │   ├── database/      # Supabase service layer
│   │   ├── services/      # Business logic services
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   └── App.tsx            # Main app component
├── supabase/
│   └── migrations/        # Database migrations
├── docs/
│   └── MINDPAL_INTEGRATION.md  # MindPal developer guide
└── public/                # Static assets
```

## Database Schema

The database includes these main tables:

- `users_ext` - Extended user profiles
- `projects` - Heat pump installation projects
- `contractor_bids` - Individual contractor bids
- `bid_line_items` - Itemized cost breakdown
- `bid_equipment` - Equipment specifications
- `bid_analysis` - AI-generated analysis
- `pdf_uploads` - PDF upload tracking
- `mindpal_extractions` - Raw MindPal extraction data
- `rebate_programs` - Available rebates
- `project_rebates` - Project-specific rebate eligibility

See `supabase/migrations/001_create_bidsmart_schema.sql` for full schema.

## MindPal Integration

BidSmart uses MindPal.space for AI-powered PDF extraction. See `docs/MINDPAL_INTEGRATION.md` for:

- Input/output JSON schemas
- Webhook configuration
- Prompt engineering guidance
- Error handling

## Data Flow

```
1. User uploads PDF
   ↓
2. PDF stored in Supabase Storage
   ↓
3. BidSmart triggers MindPal webhook
   ↓
4. MindPal extracts structured data
   ↓
5. MindPal calls back with JSON
   ↓
6. BidSmart maps to database
   ↓
7. Scores calculated automatically
   ↓
8. User sees comparison & recommendations
```

## Scoring Algorithm

Bids are scored on multiple dimensions:

| Dimension | Default Weight | Description |
|-----------|---------------|-------------|
| Price | 30% | Lower is better, normalized against all bids |
| Efficiency | 25% | Based on SEER/HSPF ratings |
| Warranty | 20% | Labor + equipment warranty terms |
| Completeness | 15% | How much information was provided |
| Timeline | 10% | Installation timeline reasonableness |

Users can customize these weights to match their priorities.

## API Endpoints

### Webhook Callback (for MindPal)

```
POST /api/mindpal/callback
Content-Type: application/json
X-MindPal-Signature: {hmac-signature}

{
  "request_id": "uuid",
  "status": "success",
  "extraction_timestamp": "2025-01-19T15:30:00Z",
  ...
}
```

## Deployment

### Netlify

1. Connect your repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables in Netlify dashboard

### Vercel

1. Import project from GitHub
2. Framework preset: Vite
3. Add environment variables in project settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run typecheck`
5. Submit a pull request

## License

Proprietary - TheSwitchIsOn.org

## Support

For questions about BidSmart:
- Technical issues: [GitHub Issues]
- Partnership inquiries: partners@theswitchison.org
