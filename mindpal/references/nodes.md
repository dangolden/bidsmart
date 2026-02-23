# MindPal — Workflow Nodes, Variables & Run Modes

Source: docs.mindpal.space/workflow/build/* (Feb 2026)

---

## All 14 Node Types

### Human Input Node
Collects input to start or pause a workflow. Each field gets a label and type (TEXT, NUMBER, DATE, SELECT, DOCUMENT). Fields become **Human Input Value Variables** usable by all downstream nodes. Mark required fields as needed. One workflow must have exactly one starting node (no incoming connections).

### Agent Node
Executes a single focused task. Two config fields only:
1. **Agent** — Select from agent library, or leave blank for general tasks
2. **Prompt** — Task instruction for this step; reference previous steps via variables

Key distinction: System Instructions = WHO the agent is (persistent). Prompt = WHAT to do NOW (per-step).

### Evaluator-Optimizer Node
Iterative improvement loop:
1. Executor Agent generates output
2. Evaluator Agent reviews against criteria and gives feedback
3. Executor revises
4. Repeats until criteria pass

Good for: Quality-sensitive outputs (report writing, question generation) where one pass isn't reliable enough.

### Loop Node
Processes a list of items with the same agent and task.

**Four config fields:**
1. **"For each item in"** — Variable reference to list; MindPal auto-converts to processable items
2. **Agent Selection** — Same agent processes all items
3. **Task** — Per-item instruction; use `{{document_url}}` or `{{#currentItem}}` for the current item
4. **Max items to process** — Slider, default max 10; set this appropriately or you'll miss PDFs

**Loop vs. Orchestrator-Worker:**
- **Loop** = items known upfront, same task for each → use for BidSmart PDF extraction
- **Orchestrator-Worker** = AI needs to discover subtasks dynamically → do NOT use for BidSmart

**BidSmart:** EXTRACT_ALL_BIDS is a Loop Node — one pass per PDF, each calls Document Extractor subflow.

⚠️ Outputs from Loop nodes are simplified to string representations in Code Nodes. Use with caution; prefer Agent Node outputs for Code Node inputs.

### Orchestrator-Worker Node
Orchestrator agent breaks complex tasks into subtasks dynamically and delegates to worker agents. Adapts the plan as new information emerges. **NOT recommended for BidSmart** — PDF list is known upfront, making Loop Node the correct choice. Less predictable and more expensive.

### Subflow Node
Calls another complete workflow as a reusable step. Pre-fill the subflow's Human Input fields by mapping current workflow variables to them. Don't need to fill all fields.

**BidSmart:** Document Extractor subflow is called once per PDF by the Loop Node.

### Chat Node
Back-and-forth conversation within a workflow step. For discovery, clarification gathering, or guided dialogue before proceeding to automated steps.

### Canvas Node
Visual scratchpad for diagramming within the workflow. Not executed — purely visual.

### Code Node
Deterministic logic with no LLM variability — calculations, transformations, JSON merging/validation.

**Three setup steps:**
1. **Define Inputs** — Name inputs and map to previous node outputs via variable references
2. **Write Code** — Python or JavaScript
3. **Define Outputs** — Declare variable names your code produces; available to downstream nodes

**⚠️ CRITICAL from official MindPal docs:**
1. **ALL inputs arrive as strings.** Even JSON from an Agent Node is a string. Always parse:
   ```javascript
   const data = JSON.parse(inputString);
   ```
2. **Outputs from Loop, Orchestrator, or Gate nodes are simplified to string representations.** Prefer referencing Agent Node and Human Input Node outputs in Code Nodes.
3. If an agent outputs JSON wrapped in markdown code blocks (despite JSON mode), strip before parsing:
   ```javascript
   function safeParseJSON(str) {
     if (!str) return null;
     const cleaned = str.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
     try { return JSON.parse(cleaned); } catch(e) { return null; }
   }
   ```

**Supported languages:** Python and JavaScript

### Router Node
Directs workflow to different paths based on conditions. **Always continues** — just down different branches. Conditions should be specific and explicit in the prompt.

### Gate Node
Evaluates a condition and either **continues OR terminates** the workflow. Once terminated, no further nodes run (no further credits consumed). Perfect for cost control and safety validation.

**Config:**
1. **Agent** — Can be blank for simple checks; needs reasoning ability for nuanced conditions
2. **Decision Logic** — Clear criteria; specify exactly what causes stop vs. continue

**Gate vs. Router quick reference:**
| | Gate | Router |
|---|---|---|
| Outcome | Stop OR continue | Always continues, different paths |
| Use case | Stop if not a heat pump | Route heat pumps vs. gas furnaces differently |

**BidSmart use case:** Gate Node after Extract All Bids loop — checks `is_heat_pump: true` on all bids. If any bid is a gas furnace, terminates workflow before spending credits on research/scoring.

### Webhook Node
Sends all workflow results to an external URL via HTTP POST when triggered. One workflow can have multiple Webhook Nodes at different points.

**Config:** Webhook URL + optional headers. Use "Send test data" button to verify before going live.

**Exact payload structure (MindPal sends this):**
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

**Make.com indexing:** MindPal's `index` is 0-based. Make.com array access is **1-based**. The 5th item in `workflow_run_output` has `"index": 4` in the payload but is accessed as `workflow_run_output[5]` in Make.com. Always verify using Make.com's data preview, not calculated values.

### Payment Node
Triggers a payment when executed. Used for monetized published workflows.

### Sticky Note Node
Documentation notes on the workflow canvas. Not executed — purely visual for team collaboration.

---

## Variables — How Data Flows Between Nodes

### Two Types
- **Human Input Value Variables** — From Human Input Node fields
- **AI Step Output Variables** — Results from previous Agent, Code, or Loop nodes

### Syntax
```
Human Input field:   @[Node Name - field_name](type=WORKFLOW_HUMAN_INPUT_FIELD&workflowHumanInputFieldId=xxx)
Previous node output: @[Node Name](type=WORKFLOW_NODE&workflowNodeId=xxx)
Loop current item:   {{document_url}}  or  {{#currentItem}}
```

Always use the **variable picker button** ("+") in the MindPal UI. Never type variable syntax manually — you'll get plain text that looks right but doesn't connect.

### THE PURPLE HIGHLIGHT RULE ⚠️
A variable is only correctly configured if it shows **purple highlight** in the MindPal UI. Plain text = not connected = data will NOT flow at runtime. This is the #1 source of empty outputs, empty arrays, and agents that ignore prior steps.

### Forward References Are Impossible
You can ONLY reference nodes that execute **before** the current step. Referencing a later node = circular dependency error.

---

## Workflow Run Modes

| Mode | Behavior | Use For |
|---|---|---|
| **Default** | Real-time, immediate results | Production, individual analyses |
| **Supervised** | Review and approve each step; can edit between steps | Debugging, validating new agents |
| **In Background** | Process while doing other work; close window and return | Long-running workflows (BidSmart ~3-5 min) |
| **Bulk Run** | Upload batch inputs; parallel processing; results in table | High-volume batch processing |

**BidSmart recommendation:** Use Supervised mode when diagnosing agent output quality — you can see exactly what each agent produced and regenerate individual steps.

---

## Common Workflow Structure Issues (from official docs)

1. **Multiple starting points** — Must have exactly ONE node with no incoming connections. All other nodes must connect to the main chain.
2. **Disconnected nodes** — Nodes not connected to the flow are silently skipped.
3. **Circular dependencies** — Node A references Node B, Node B references Node A → workflow fails.
4. **Variable not purple** — Data appears to arrive but is actually empty at runtime.
5. **Wrong variable** — Referencing the wrong field from a Human Input Node that has multiple fields.
