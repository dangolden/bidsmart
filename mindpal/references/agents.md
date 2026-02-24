# MindPal — Agents Platform Reference

Source: docs.mindpal.space/agent/* (Feb 2026)

---

## What Is an Agent?

A specialized AI assistant trained for a specific task. Give it a role, instructions, knowledge, and tools. Agents are the fundamental building block; workflows connect multiple agents into pipelines.

---

## System Instructions — Two Required Sections

System instructions become the model's `system prompt`. They persist across ALL interactions — direct chat, workflow steps, and API calls.

### Section 1: Background
Defines WHO the agent is and WHAT it does. Include:
- **Role and identity** — "You are a precision data extraction specialist"
- **Behavioral guidelines** — "You communicate objectively and never make recommendations"
- **Task parameters** — "You always extract pricing before equipment specs"
- **Knowledge boundaries** — "You have deep knowledge of HVAC efficiency standards"
- **Tool usage guidelines** — "Use web search with at least 3 distinct queries per contractor"

### Section 2: Desired Output Format
Defines HOW the agent structures responses. Specify:
- **Response structure** — How information is organized
- **Required components** — What must appear in every response
- **Formatting preferences** — Prose vs. JSON vs. markdown
- **Specific templates** — Exact JSON schema with field names and types
- **Output constraints** — "Output ONLY valid JSON. No markdown. No code blocks. No text before or after."

### Best Practices (from official docs)

**Do:**
- Be specific and unambiguous — vagueness causes inconsistent output
- Keep the agent's purpose narrow; one agent, one job
- Include examples of desired responses
- Set explicit boundaries — state what the agent should NOT do
- Update regularly based on actual performance

**Don't:**
- Give conflicting instructions
- Assume the agent knows things — state them explicitly
- Overload with too many responsibilities
- Skip testing after making changes

---

## Language Model Settings

### Model Selection

| Model Family | Key Strengths | Best For in BidSmart |
|---|---|---|
| Claude Sonnet (Anthropic) | Superior extraction, nuanced analysis, image/PDF support | Bid Data Extractor, Scoring Engine, Question Generator |
| Claude Haiku (Anthropic) | Fast, cheap, good formatting | FAQ Generator |
| Gemini Pro/Flash (Google) | Large context, visual understanding, strong web research | Incentive Finder, Contractor/Equipment Researcher |
| GPT-4o / GPT-5 (OpenAI) | Excellent instruction-following, consistent JSON | Scoring Engine fallback |
| Perplexity Sonar | Built-in web search | Research steps (replaces web tool setup) |
| DeepSeek V3/R1 | Cheapest coding/logic tasks | Code Node logic (not JSON Assembler — use JS there) |

**Default model** when none selected: GPT-4o Mini

**Selection rules:**
- PDF/image extraction → must support multimodal (Claude Sonnet, Gemini Pro)
- Web search → must support tools (Claude Sonnet, Gemini Flash, or use Perplexity Sonar)
- Large inputs (full web search results) → need large context window (Gemini Flash 2.5+)
- Simple formatting/summarization → use cheapest option (Haiku, Gemini Flash = 1 credit)

### Max Output Length
- 1,000 tokens ≈ 750 words
- "Auto" lets the model adjust — good default
- For JSON Assembler and bid extraction: set high enough to fit the full output (3-5 bids = large)

### Temperature
- **Low / Auto**: Extraction, scoring, JSON output — need consistency
- **Higher**: FAQ generation, creative descriptions — benefit from variation

---

## Knowledge Sources

Located at: Assets → Knowledge Sources

**Supported types:** PDF, Word, PPT, Excel, CSV, audio, video, URLs (with recursive sub-page fetching), Notes (editable text)

**How it works:** Content is chunked and vectorized. When agent runs, MindPal semantically searches and injects the most relevant chunks into context.

**Assignment:** Agent Settings → select individual files or folders. Folder changes auto-apply to all agents in that folder.

**CRITICAL:** You must explicitly tell the agent to use knowledge in the system instructions or prompt. Without this prompt, agents may ignore attached documents entirely. Example: "Use the HVAC scoring criteria from your knowledge base to evaluate each bid."

---

## Tools (HTTP API Connections)

Assets → Tools → Configure:
- HTTP Method: GET / POST / PUT / DELETE
- Endpoint URL
- Headers, Query Parameters, Request Body (key/value pairs)
- Per field: "Determined by AI" (agent fills dynamically from context) vs. fixed value

An agent can use multiple tools simultaneously or multiple instances of the same tool.

Guide tool usage explicitly in system instructions: "When researching contractors, make three separate web searches: one for reviews, one for BBB status, one for licensing."

---

## Model Context Protocol (MCP)

Connect agents to external services via a single URL endpoint. Agent Settings → MCP Section → Add URL.

**Supported server types:** Streamable HTTP and SSE (Server-Sent Events)  
**Not supported:** OAuth 2.1 without dynamic client registration (Atlassian, GitHub, Box, Plaid), Resources/Prompts/Sampling (only Tools work)

**Setup for API-key servers:**
1. Paste the MCP server URL
2. Add `Authorization: Bearer <API_KEY>` header
3. Save → MindPal auto-tests and retrieves available tools

**Popular compatible servers:**
- Zapier (7,000+ app actions)
- Make.com (scenarios as tools)
- Apify — `https://mcp.apify.com` (web scraping)
- Firecrawl — `https://mcp.firecrawl.dev/{API_KEY}/sse`
- n8n workflows

⚠️ MCP is early-stage. Test thoroughly in-app before deploying to API-triggered production workflows.

---

## Composio Integrations

Alternative to MCP using OAuth (not API keys). Assets → Composio → Connect app → Select allowed actions. Supports Gmail, Slack, Notion, Salesforce, and 250+ others. SOC 2 compliant, AES-256 encrypted at rest. Follow principle of least privilege — only enable actions the agent actually needs.
