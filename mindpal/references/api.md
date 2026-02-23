# MindPal — API Integrations Deep Reference

Source: docs.mindpal.space/workflow/trigger/api + /workspace/ai-credit + /workflow/common-issues (Feb 2026)
Official Swagger: https://api-v3.mindpal.io/docs

---

## Architecture: Async-First

**Critical:** MindPal workflows are asynchronous. POSTing to the API returns a `workflow_run_id` immediately — NOT results. The workflow then runs independently (BidSmart takes 3–10 minutes).

**Two patterns to get results:**

| Pattern | Method | Use When |
|---|---|---|
| **Webhook (recommended)** | Add Webhook Node at end; MindPal POSTs results when done | Production — no polling overhead |
| **Polling** | GET result endpoint with run ID every 10–15s | Dev/debug; simple integrations |

BidSmart uses: Webhook Node → Make.com → Supabase (webhook pattern).

---

## Triggering a Workflow

```
POST https://api-v3.mindpal.io/api/v1/workflow-runs?workflow_id={WORKFLOW_ID}

Headers:
  Authorization: Bearer {MINDPAL_API_KEY}
  Content-Type: application/json

Body:
{
  "data": {
    "{field_id}": "value"
  }
}

Response (immediate):
{
  "workflow_run_id": "abc123..."
}
```

**Where to get `MINDPAL_API_KEY`:** MindPal workspace settings → API section.

**Where to get field IDs and exact schema:** Open workflow in builder → click **"API Reference" tab**. This generates the exact request schema for your specific workflow. Always use this tab, not guesswork — field IDs are auto-generated MongoDB ObjectIDs.

**⚠️ Requirements from official docs (failures are silent and hard to debug):**
- Field IDs are **case-sensitive** — "even minor syntax errors, such as incorrect casing, will cause the API to fail"
- Data must **exactly match** the input schema
- All values are strings; array/object values must be JSON-stringified
- Workflow must have exactly one starting node

---

## Polling for Results

```
GET https://api-v3.mindpal.io/api/workflow-run-result/retrieve-by-id?id={WORKFLOW_RUN_ID}

Headers:
  Authorization: Bearer {MINDPAL_API_KEY}
```

Poll every 10–15 seconds. Response mirrors the Webhook Node payload structure (see Webhook Payload section below). Recommend 10-minute timeout max for BidSmart before treating as failed.

---

## Schedule Trigger

Configured directly in workflow trigger settings within MindPal. Requires **paid plan** — unpublished workflows will not trigger on schedule. Verify timezone settings carefully; MindPal defaults may not match your target timezone.

---

## Full BidSmart Request Example

```javascript
// ⚠️ Correct base: api-v3.mindpal.io (NOT api.mindpal.io)
// ⚠️ Correct format: query param ?workflow_id= (NOT path param)

const WORKFLOW_ID = '69860fd696be27d5d9cb4252';
const FIELD_IDS = {
  documents:       '69860fd696be27d5d9cb4258',
  user_priorities: '69860fd696be27d5d9cb4255',
  request_id:      '69860fd696be27d5d9cb4257',
  callback_url:    '69860fd696be27d5d9cb4256'
};

async function triggerBidSmartAnalysis({ pdfUrls, userPriorities, requestId, callbackUrl }) {
  const response = await fetch(
    `https://api-v3.mindpal.io/api/v1/workflow-runs?workflow_id=${WORKFLOW_ID}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MINDPAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          [FIELD_IDS.documents]:       JSON.stringify(pdfUrls),        // array → string
          [FIELD_IDS.user_priorities]: JSON.stringify(userPriorities), // object → string
          [FIELD_IDS.request_id]:      requestId,
          [FIELD_IDS.callback_url]:    callbackUrl
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MindPal API error ${response.status}: ${error}`);
  }

  const { workflow_run_id } = await response.json();
  return workflow_run_id;
}
```

**Common failure causes:**
- Using `api.mindpal.io` instead of `api-v3.mindpal.io`
- Using path-param format instead of `?workflow_id=` query param
- Field IDs with typos or wrong case
- `documents` or `user_priorities` not JSON-stringified (they're objects, must be strings)
- Missing or malformed `Authorization: Bearer` header

---

## Webhook Node Payload Schema

MindPal POSTs this when the Webhook Node fires:

```json
{
  "workflow_run_id": "string",
  "workflow_id": "string",
  "workflow_title": "string",
  "workflow_run_input": [
    { "index": 0, "title": "string", "type": "TEXT|DOCUMENT|etc.", "content": "string" }
  ],
  "workflow_run_output": [
    { "index": 0, "title": "string", "type": "AGENT|CODE|LOOP|etc.", "content": "string" }
  ]
}
```

**Extracting JSON Assembler output in Make.com:**
```
workflow_run_output array
  → filter where title = "JSON Assembler & Validator"
  → extract .content
  → JSON.parse(content)
  → this is your structured result object
```

**⚠️ Make.com 1-based vs MindPal 0-based:** Make.com position numbers start at 1; MindPal's `index` field starts at 0. Always verify by checking Make.com's data preview panel — don't calculate from MindPal's index value.

**⚠️ Make.com variable spacing bug:** Make.com UI auto-inserts spaces: `{{ variable }}`. This breaks JSON strings. Always edit the raw JSON directly in HTTP modules — never use the field mapper UI to insert variables into JSON bodies.

---

## AI Credit Costs by Model

Each workflow node step = one credit request.

### Anthropic (Claude)
| Model | Credits | BidSmart Use |
|---|---|---|
| Claude Opus 4.5 | 40 | Complex synthesis (avoid in loops) |
| Claude 4.5 / 4 Sonnet | 20 | Bid extraction, scoring, question generator |
| Claude 3.5 Sonnet | 20 | Reliable fallback |
| Claude 4.5 Haiku | 10 | FAQ generation |
| Claude 3 Haiku | 5 | Budget formatting |

### Google (Gemini)
| Model | Credits | BidSmart Use |
|---|---|---|
| Gemini 2.5 / 3.0 Pro | 10 | Large-context research |
| Gemini 2.5 / 3.0 Flash | **1** | **Cheapest useful model** — contractor/equipment research |

### OpenAI
| Model | Credits | Notes |
|---|---|---|
| GPT-5 / GPT-5.1 / GPT-4.1 | 15 | Complex reasoning |
| GPT-5 Mini | 3 | Balanced quality/cost |
| o3 | 100 | Advanced reasoning (expensive) |
| o4 Mini | 8 | Reasoning at lower cost |

### DeepSeek (cheapest)
| Model | Credits | Notes |
|---|---|---|
| DeepSeek V3 / R1 | **0.5** | Code/logic, cheapest option |

### Perplexity (built-in web search)
| Model | Credits | Notes |
|---|---|---|
| Sonar | 1 | Quick search |
| Sonar Pro | 10 | Enhanced quality |
| Sonar Deep Research | 20 | Thorough research |

**BidSmart cost estimate for 3-bid analysis:** ~200–250 credits/run  
(Extractor: 20×3 bids + Researcher: 10×3 + Incentive: 10 + Scoring: 20 + Questions: 20 + FAQ: 5)

**Viewing actual cost:** Open any completed workflow run — exact credit cost is displayed.  
**Estimating:** Workflow builder top-left corner shows real-time credit estimate before running.

---

## Bring Your Own API Keys (BYOK)

On the **Pro plan**, connect your own OpenAI, Anthropic, or Google API keys. MindPal charges 0 credits for those steps; you pay the provider directly at their rates. Eliminates credit budgeting for high-volume production use. Settings → Workspace → API Keys.

---

## Agent HTTP Tools

Give individual agents the ability to call external APIs (not to be confused with workflow-level API triggers).

Assets → Tools → New Tool → Configure:
- HTTP Method (GET/POST/PUT/DELETE)
- Endpoint URL
- Headers, Query Parameters, Request Body
- Per field: "Determined by AI" (agent fills from context) vs. fixed value

An agent can use multiple tools simultaneously or multiple instances of the same tool.

---

## Common API Issues (from official docs)

| Issue | Cause | Fix |
|---|---|---|
| API trigger fails silently | Casing error in field IDs or wrong endpoint | Use "API Reference" tab; validate JSON; check casing |
| Webhook node fails to send | Wrong URL, endpoint down, auth missing | Test URL with Postman first; add required headers |
| Scheduled trigger doesn't fire | Unpublished workflow or wrong timezone | Publish workflow; verify timezone; check plan level |
| Workflow times out | Too many steps or loop iterations | Use Background Mode; reduce loop max items; use Subflows |
| High credit consumption | Expensive model on every step | Switch research steps to Gemini Flash (1cr) or DeepSeek (0.5cr) |
