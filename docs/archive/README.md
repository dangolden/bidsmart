# Archived Documentation

These files are from earlier project phases and are **not current** for the v2 schema / v18 MindPal workflow.

The current project state is documented by:
- `docs/V2_REFACTORING_PLAN.md` — v2 schema decomposition (source of truth)
- `docs/BID_EQUIPMENT_SCHEMA.md` — `bid_equipment` table spec
- `docs/SCHEMA_V2_COMPLETE.html` — interactive v2 schema reference
- `mindpal/nodes/` — v18 node specs and prompts
- `mindpal/MINDPAL_BUILD_GUIDE.md` — current build guide

---

## MindPal v8/v10 Workflow (Retired)

JSON Assembler architecture, Make.com webhook routing, and old field mappings.

| File | Was | Why Archived |
|------|-----|-------------|
| `MINDPAL_V8_CONFIG.md` | v8 node IDs | Completely superseded |
| `MAKE_WEBHOOK_INTEGRATION.md` | Make.com webhook flow | Architecture retired |
| `MINDPAL_INTEGRATION.md` | v8 integration guide | Superseded by new build guide |
| `V8_INTEGRATION_GUIDE.md` | v8 frontend integration | Superseded |
| `MINDPAL_V10_FIELD_MAPPING_AUDIT.md` | v10 field audit | Based on old 98-column schema |
| `MINDPAL_V10_FIELD_MAPPING_AUDIT.html` | v10 audit (rendered) | Based on old schema |
| `SUPABASE_TABLE_FIELD_AUDIT.html` | v10 companion audit | Superseded by V2_REFACTORING_PLAN |
| `MINDPAL_SCHEMA_MAPPING.md` | v24 node→table mapping | References JSON Assembler |
| `mindpal-json-assembler-schema.md` | JSON Assembler spec | Node type retired in v2 |
| `mindpal-schema-reference.md` | All-table field reference | References JSON Assembler pattern |
| `workflow-node-field-mapping.md` | Node→field mapping | Old architecture |
| `mindpal-v10-prompts/` | v10 agent prompts | Old equipment_type values, old field names |

## Client Delivery v1.0 (Jan 2025)

Original delivery package for TheSwitchIsOn.org. References old architecture and will need updating for v2.

| File | Was | Why Archived |
|------|-----|-------------|
| `CLIENT_DELIVERY_README.md` | Client delivery overview | References old MINDPAL_INTEGRATION.md |
| `CLIENT_EMBEDDING_GUIDE.md` | iframe embedding instructions | Version-agnostic but bundled with v1 delivery |
| `DEPLOYMENT_CHECKLIST.md` | Pre-deployment checklist | References old architecture |
| `DEPLOYMENT_DOMAINS.md` | Authorized domains for CSP | Version-agnostic but part of v1 delivery |
| `EMBED_SECURITY.md` | iframe security config | Version-agnostic but part of v1 delivery |
| `INTERNAL_HomeDoc_Deployment_Guide.md` | Full deployment guide | References old Netlify + Supabase setup |
| `INTERNAL_Hosting_Strategy_Analysis.md` | Hosting comparison | Decision already made |
| `INTERNAL_Responsibility_Matrix.md` | HomeDoc vs. client responsibilities | May be reusable for v2 delivery |
| `README_DOCS_ORGANIZATION.md` | Docs navigation guide | References archived files |
| `production-embed-example.html` | Full embed example | v1 delivery artifact |
| `production-embed-simple.html` | Simple embed example | v1 delivery artifact |
| `test-embed.html` | Embed test page | v1 delivery artifact |
