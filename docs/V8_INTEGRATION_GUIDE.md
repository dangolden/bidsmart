# BidSmart v8 Frontend Integration Guide

This document provides instructions for integrating the new v8 components into existing pages.

---

## New Components Created

### FAQ Components
1. **`ProjectFAQSection.tsx`** - Overall project FAQs
   - Displays overall FAQs with confidence badges
   - Shows evidence for each answer
   - Expandable/collapsible questions

2. **`ClarificationQuestionsSection.tsx`** - Contractor questions
   - Groups questions by contractor
   - Priority badges (high/medium/low)
   - Shows good vs concerning answer examples

### Electrical Components
1. **`ElectricalInfoCard.tsx`** - Individual bid electrical details
   - Panel assessment status
   - Upgrade requirements and costs
   - Breaker size and circuit info
   - Permits and load calculations

2. **`ElectricalComparisonTable.tsx`** - Side-by-side comparison
   - Compare electrical requirements across all bids
   - Highlights panel upgrade costs
   - Shows missing information

---

## Integration Points

### Phase: Compare (ComparePhase.tsx)

**Add new tab for Electrical:**
```tsx
const tabs: TabConfig[] = [
  {
    key: 'equipment',
    label: 'Equipment',
    description: 'Specs, efficiency ratings, and features',
    icon: <Zap className="w-5 h-5" />
  },
  {
    key: 'contractors',
    label: 'Contractors',
    description: 'Experience, ratings, and certifications',
    icon: <Award className="w-5 h-5" />
  },
  {
    key: 'costs',
    label: 'Cost & Scope',
    description: 'Pricing, warranties, and what\'s included',
    icon: <DollarSign className="w-5 h-5" />
  },
  // ADD THIS:
  {
    key: 'electrical',
    label: 'Electrical',
    description: 'Panel capacity, upgrades, and requirements',
    icon: <Zap className="w-5 h-5" />
  },
];
```

**Add electrical tab content:**
```tsx
{activeTab === 'electrical' && (
  <ElectricalComparisonTable bids={bids.map(b => b.bid)} />
)}
```

**Add FAQs section (after comparison tables, before export):**
```tsx
{/* FAQs Section */}
{analysis?.faqs && (
  <ProjectFAQSection faqData={analysis.faqs} className="mt-8" />
)}

{/* Clarification Questions */}
{analysis?.clarification_questions && analysis.clarification_questions.length > 0 && (
  <ClarificationQuestionsSection 
    questions={analysis.clarification_questions} 
    className="mt-8" 
  />
)}
```

### Phase: Decide (DecidePhase.tsx)

**Add electrical info to bid cards:**
```tsx
import { ElectricalInfoCard } from '../ElectricalInfoCard';

// In the bid detail view:
<ElectricalInfoCard bid={selectedBid} className="mt-6" />
```

**Add FAQs to decision page:**
```tsx
{analysis?.faqs && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
    <ProjectFAQSection faqData={analysis.faqs} />
  </div>
)}
```

### BidCard.tsx Updates

**Add electrical summary badge:**
```tsx
{bid.electrical_panel_upgrade_included && (
  <span className="status-badge bg-amber-100 text-amber-700">
    <AlertTriangle className="w-3 h-3 mr-1" />
    Panel Upgrade: {formatCurrency(bid.electrical_panel_upgrade_cost)}
  </span>
)}
```

**Add red flags display:**
```tsx
{bid.red_flags && bid.red_flags.length > 0 && (
  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-sm font-medium text-red-900 mb-2">Red Flags</p>
    <ul className="space-y-1">
      {bid.red_flags.slice(0, 2).map((flag, idx) => (
        <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{flag.issue}</span>
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## Data Fetching

### Update ProjectSummary Type

Ensure `bid_analysis` includes new fields:
```tsx
interface ProjectSummary {
  // ... existing fields
  bid_analysis?: {
    faqs: FAQData | null;
    clarification_questions: ClarificationQuestion[] | null;
    // ... other fields
  };
}
```

### Fetch Analysis Data

In `bidsmartService.ts`, update `getProjectSummary`:
```tsx
const { data: analysis } = await supabase
  .from('bid_analysis')
  .select('*, faqs, clarification_questions')
  .eq('project_id', projectId)
  .maybeSingle();
```

---

## Styling Notes

All new components use existing BidSmart design system:
- **Colors**: `switch-green`, `amber`, `blue`, `red` for status indicators
- **Spacing**: Consistent padding/margins with existing components
- **Icons**: Lucide React icons matching existing usage
- **Responsive**: Mobile-first with `sm:` breakpoints

---

## Testing Checklist

- [ ] FAQs display correctly with evidence
- [ ] Clarification questions grouped by contractor
- [ ] Electrical comparison table shows all bids
- [ ] Panel upgrade costs highlighted
- [ ] Red flags display on bid cards
- [ ] Positive indicators show appropriately
- [ ] Missing electrical data shows warning
- [ ] Mobile responsive on all new components
- [ ] Expandable sections work correctly
- [ ] Confidence badges display properly

---

## Database Requirements

Ensure migrations are applied:
```bash
supabase db push
```

This applies:
- `020_add_v8_fields.sql` - Adds electrical columns
- `021_populate_demo_v8_data.sql` - Basic demo data
- `022_enhance_demo_v8_data.sql` - Realistic scenarios
- `023_seed_test_account_v8.sql` - Test account data

---

## Import Statements

Add these imports to files that use new components:

```tsx
// FAQ Components
import { ProjectFAQSection } from '../ProjectFAQSection';
import { ClarificationQuestionsSection } from '../ClarificationQuestionsSection';

// Electrical Components
import { ElectricalInfoCard } from '../ElectricalInfoCard';
import { ElectricalComparisonTable } from '../ElectricalComparisonTable';

// Types
import type { FAQData, ClarificationQuestion } from '../lib/types';
```

---

## Next Steps

1. Apply database migrations
2. Add imports to phase components
3. Integrate components into Compare and Decide phases
4. Update BidCard with electrical summary
5. Test with demo data
6. Deploy and verify in staging
