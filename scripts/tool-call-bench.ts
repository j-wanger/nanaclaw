#!/usr/bin/env bun
/**
 * Tool-calling experiment harness for Qwen via llama-cpp.
 * Tests whether the model can reliably produce tool calls via /v1/chat/completions.
 *
 * Usage:
 *   bun run scripts/tool-call-bench.ts --health     # live server check
 *   bun run scripts/tool-call-bench.ts --dry-run    # validate harness structure (no server needed)
 *   bun run scripts/tool-call-bench.ts --run <N>    # run experiment N
 *   bun run scripts/tool-call-bench.ts --run all    # run all experiments
 */

const LLAMA_URL = process.env.NANOCLAW_LLAMA_URL || 'http://localhost:8080';
const CHAT_ENDPOINT = `${LLAMA_URL}/v1/chat/completions`;
const TRIALS = parseInt(process.env.TOOL_CALL_TRIALS || '3', 10);

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ExperimentConfig {
  id: number;
  name: string;
  description: string;
  messages: Array<{ role: string; content: string }>;
  tools: ToolDefinition[];
  expect: {
    has_tool_call: boolean;
    tool_name?: string;
    param_check?: (params: Record<string, unknown>) => boolean;
  };
}

interface TrialResult {
  trial: number;
  passed: boolean;
  response_type: 'tool_call' | 'content' | 'error';
  tool_name?: string;
  params?: Record<string, unknown>;
  raw_content?: string;
  error?: string;
  latency_ms: number;
}

interface ExperimentResult {
  id: number;
  name: string;
  trials: TrialResult[];
  pass_rate: number;
  verdict: 'pass' | 'fail' | 'partial';
}

// --- Sample tools for experiments ---

const SAMPLE_TOOLS: Record<string, ToolDefinition> = {
  web_search: {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for information. Returns a list of results with titles, URLs, and snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          max_results: { type: 'number', description: 'Maximum results to return (default: 5)' },
        },
        required: ['query'],
      },
    },
  },
  web_extract: {
    type: 'function',
    function: {
      name: 'web_extract',
      description: 'Extract the main content from a URL as clean markdown.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to extract content from' },
          max_chars: { type: 'number', description: 'Maximum characters to return (default: 20000)' },
        },
        required: ['url'],
      },
    },
  },
  wiki_write: {
    type: 'function',
    function: {
      name: 'wiki_write',
      description: 'Write a research article to the knowledge wiki.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Article title' },
          content: { type: 'string', description: 'Article content in markdown' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
          topic: { type: 'string', description: 'Topic description for wiki routing' },
        },
        required: ['title', 'content', 'tags'],
      },
    },
  },
  calculator: {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Perform a mathematical calculation.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression to evaluate' },
        },
        required: ['expression'],
      },
    },
  },
};

// --- Core harness functions ---

async function callWithTools(
  messages: Array<{ role: string; content: string }>,
  tools: ToolDefinition[],
): Promise<{ type: 'tool_call' | 'content' | 'error'; tool_name?: string; params?: Record<string, unknown>; content?: string; error?: string }> {
  const body = {
    model: 'qwen',
    messages,
    tools,
    tool_choice: 'auto',
  };

  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return { type: 'error', error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  }

  const json = await res.json() as Record<string, unknown>;
  const choices = json.choices as Array<Record<string, unknown>>;
  if (!choices?.length) return { type: 'error', error: 'No choices in response' };

  const message = choices[0].message as Record<string, unknown>;

  // Check for tool_calls in response
  const toolCalls = message.tool_calls as Array<Record<string, unknown>> | undefined;
  if (toolCalls?.length) {
    const call = toolCalls[0];
    const fn = call.function as Record<string, unknown>;
    let params: Record<string, unknown> = {};
    try {
      params = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : (fn.arguments as Record<string, unknown>) || {};
    } catch {
      params = { _raw: fn.arguments };
    }
    return { type: 'tool_call', tool_name: fn.name as string, params };
  }

  // Fallback: check content for tool-call-like patterns (XML/JSON in content)
  const content = message.content as string || '';
  return { type: 'content', content };
}

async function runExperiment(config: ExperimentConfig): Promise<ExperimentResult> {
  const trials: TrialResult[] = [];

  for (let t = 1; t <= TRIALS; t++) {
    const start = performance.now();
    try {
      const result = await callWithTools(config.messages, config.tools);
      const latency_ms = Math.round(performance.now() - start);

      let passed = false;
      if (config.expect.has_tool_call) {
        passed = result.type === 'tool_call'
          && (!config.expect.tool_name || result.tool_name === config.expect.tool_name)
          && (!config.expect.param_check || config.expect.param_check(result.params || {}));
      } else {
        passed = result.type === 'content';
      }

      trials.push({
        trial: t,
        passed,
        response_type: result.type,
        tool_name: result.tool_name,
        params: result.params,
        raw_content: result.content?.slice(0, 500),
        error: result.error,
        latency_ms,
      });
    } catch (err) {
      trials.push({
        trial: t,
        passed: false,
        response_type: 'error',
        error: String(err),
        latency_ms: Math.round(performance.now() - start),
      });
    }
  }

  const passCount = trials.filter(t => t.passed).length;
  const pass_rate = passCount / trials.length;

  return {
    id: config.id,
    name: config.name,
    trials,
    pass_rate,
    verdict: pass_rate >= 0.8 ? 'pass' : pass_rate >= 0.5 ? 'partial' : 'fail',
  };
}

// --- Experiment Definitions ---

const EXPERIMENTS: ExperimentConfig[] = [
  // === Basic tool-calling (1-4) ===
  {
    id: 1,
    name: 'Single tool, direct request',
    description: 'Given one tool and a direct request to use it, does the model produce a tool_call?',
    messages: [{ role: 'user', content: 'Search the web for "latest advances in graph RAG 2026"' }],
    tools: [SAMPLE_TOOLS.web_search],
    expect: { has_tool_call: true, tool_name: 'web_search', param_check: (p) => typeof p.query === 'string' && p.query.length > 0 },
  },
  {
    id: 2,
    name: 'Single tool, parameter extraction',
    description: 'Does the model extract correct parameters from natural language?',
    messages: [{ role: 'user', content: 'I need to read the content from https://arxiv.org/abs/2401.12345 but only the first 5000 characters' }],
    tools: [SAMPLE_TOOLS.web_extract],
    expect: { has_tool_call: true, tool_name: 'web_extract', param_check: (p) => p.url === 'https://arxiv.org/abs/2401.12345' && p.max_chars === 5000 },
  },
  {
    id: 3,
    name: 'Single tool, no-call scenario',
    description: 'When the task does not require tools, does the model respond with text (not a tool call)?',
    messages: [{ role: 'user', content: 'What is the capital of France?' }],
    tools: [SAMPLE_TOOLS.web_search],
    expect: { has_tool_call: false },
  },
  {
    id: 4,
    name: 'Single tool, complex parameters',
    description: 'Does the model correctly populate array and multi-field parameters?',
    messages: [{ role: 'user', content: 'Write a wiki article titled "Graph RAG Patterns" about knowledge graph retrieval, tagged with "rag", "knowledge-graph", and "retrieval"' }],
    tools: [SAMPLE_TOOLS.wiki_write],
    expect: {
      has_tool_call: true,
      tool_name: 'wiki_write',
      param_check: (p) => typeof p.title === 'string' && Array.isArray(p.tags) && p.tags.length >= 2 && typeof p.content === 'string',
    },
  },
  // === Multi-tool and multi-turn (5-8) ===
  {
    id: 5,
    name: 'Multi-tool, correct routing',
    description: 'Given multiple tools, does the model pick the correct one?',
    messages: [{ role: 'user', content: 'Search for information about SQLite WAL mode performance' }],
    tools: [SAMPLE_TOOLS.web_search, SAMPLE_TOOLS.web_extract, SAMPLE_TOOLS.wiki_write, SAMPLE_TOOLS.calculator],
    expect: { has_tool_call: true, tool_name: 'web_search' },
  },
  {
    id: 6,
    name: 'Multi-tool, distractor rejection',
    description: 'Does the model avoid calling irrelevant tools when none fit perfectly?',
    messages: [{ role: 'user', content: 'Summarize in your own words what you know about transformer attention mechanisms' }],
    tools: [SAMPLE_TOOLS.web_search, SAMPLE_TOOLS.web_extract, SAMPLE_TOOLS.wiki_write, SAMPLE_TOOLS.calculator],
    expect: { has_tool_call: false },
  },
  {
    id: 7,
    name: 'Multi-turn, tool result injection',
    description: 'After receiving a tool result, does the model reason correctly about it?',
    messages: [
      { role: 'user', content: 'Search for the latest SQLite version number' },
      { role: 'assistant', content: '' },  // placeholder — will be replaced by actual tool call
      { role: 'tool', content: JSON.stringify([{ title: 'SQLite Release 3.47.0', url: 'https://sqlite.org/releaselog/3_47_0.html', snippet: 'SQLite version 3.47.0 released 2026-01-15 with improved WAL2 support.' }]) },
      { role: 'user', content: 'Now extract the full content from that release page' },
    ],
    tools: [SAMPLE_TOOLS.web_search, SAMPLE_TOOLS.web_extract],
    expect: { has_tool_call: true, tool_name: 'web_extract', param_check: (p) => typeof p.url === 'string' && p.url.includes('sqlite.org') },
  },
  {
    id: 8,
    name: 'Multi-turn, chained reasoning',
    description: 'After search results, does the model use the information to call the next tool?',
    messages: [
      { role: 'user', content: 'Research graph RAG: first search for it, then I\'ll give you results to extract from' },
      { role: 'assistant', content: '' },
      { role: 'tool', content: JSON.stringify([{ title: 'Microsoft GraphRAG', url: 'https://microsoft.github.io/graphrag/', snippet: 'GraphRAG uses knowledge graphs to improve retrieval-augmented generation.' }, { title: 'LightRAG', url: 'https://github.com/HKUDS/LightRAG', snippet: 'Lightweight graph-based RAG system' }]) },
      { role: 'user', content: 'Extract the first result (Microsoft GraphRAG page)' },
    ],
    tools: [SAMPLE_TOOLS.web_search, SAMPLE_TOOLS.web_extract],
    expect: { has_tool_call: true, tool_name: 'web_extract', param_check: (p) => typeof p.url === 'string' && p.url.includes('microsoft') },
  },
  // === Termination and failure modes (9-12) ===
  {
    id: 9,
    name: 'Termination: task complete signal',
    description: 'After completing work with tools, does the model produce a final text response?',
    messages: [
      { role: 'user', content: 'Calculate 15 * 23 and tell me the result' },
      { role: 'assistant', content: '' },
      { role: 'tool', content: JSON.stringify({ result: 345 }) },
    ],
    tools: [SAMPLE_TOOLS.calculator],
    expect: { has_tool_call: false },  // Should produce text answer, not another tool call
  },
  {
    id: 10,
    name: 'Error handling: tool returned error',
    description: 'When a tool returns an error, does the model handle gracefully (text response or retry)?',
    messages: [
      { role: 'user', content: 'Search for quantum computing breakthroughs' },
      { role: 'assistant', content: '' },
      { role: 'tool', content: JSON.stringify({ error: 'Service unavailable: SearXNG timeout after 5000ms' }) },
    ],
    tools: [SAMPLE_TOOLS.web_search, SAMPLE_TOOLS.web_extract],
    expect: { has_tool_call: false },  // Should respond with text acknowledging error (or retry is acceptable)
  },
  {
    id: 11,
    name: 'No hallucinated tools',
    description: 'Does the model only call tools that are in the provided list?',
    messages: [{ role: 'user', content: 'Send an email to bob@example.com with the subject "test"' }],
    tools: [SAMPLE_TOOLS.web_search, SAMPLE_TOOLS.calculator],
    expect: { has_tool_call: false },  // No email tool available — should refuse with text
  },
  {
    id: 12,
    name: 'Many tools available, correct selection',
    description: 'With all tools present, does the model still pick the right one for a specific task?',
    messages: [{ role: 'user', content: 'What is the square root of 144?' }],
    tools: [SAMPLE_TOOLS.web_search, SAMPLE_TOOLS.web_extract, SAMPLE_TOOLS.wiki_write, SAMPLE_TOOLS.calculator],
    expect: { has_tool_call: true, tool_name: 'calculator', param_check: (p) => typeof p.expression === 'string' },
  },
];

// --- CLI ---

async function healthCheck() {
  try {
    const res = await fetch(`${LLAMA_URL}/v1/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as { data?: Array<{ id: string }> };
    const model = json.data?.[0]?.id || 'unknown';
    console.log(`ok: ${LLAMA_URL} — model: ${model}`);

    // Test tool-call support
    const testResult = await callWithTools(
      [{ role: 'user', content: 'What is 2+2? Use the calculator tool.' }],
      [SAMPLE_TOOLS.calculator],
    );
    console.log(`tool-call test: type=${testResult.type}${testResult.tool_name ? `, tool=${testResult.tool_name}` : ''}`);
  } catch (err) {
    console.error(`fail: ${LLAMA_URL} unreachable — ${err}`);
    process.exit(1);
  }
}

function dryRun() {
  console.log('ok: tool-call-bench dry-run');
  console.log(`  endpoint: ${LLAMA_URL}`);
  console.log(`  trials per experiment: ${TRIALS}`);
  console.log(`  sample tools defined: ${Object.keys(SAMPLE_TOOLS).length}`);
  console.log(`  harness functions: callWithTools, runExperiment`);
  console.log('  modes: --health, --dry-run, --run <N|all>');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--dry-run')) {
    dryRun();
    return;
  }

  if (args.includes('--health')) {
    await healthCheck();
    return;
  }

  if (args.includes('--run')) {
    const target = args[args.indexOf('--run') + 1];
    if (!target) {
      console.error('Usage: --run <experiment-number|all>');
      process.exit(1);
    }

    let toRun: ExperimentConfig[];
    if (target === 'all') {
      toRun = EXPERIMENTS;
    } else {
      const ids = target.split(',').map(s => parseInt(s.trim(), 10));
      toRun = EXPERIMENTS.filter(e => ids.includes(e.id));
      if (toRun.length === 0) {
        console.error(`No experiments found for ids: ${target}`);
        process.exit(1);
      }
    }

    console.log(`Running ${toRun.length} experiment(s) with ${TRIALS} trials each...\n`);
    const results: ExperimentResult[] = [];

    for (const config of toRun) {
      console.log(`## Experiment ${config.id}: ${config.name}`);
      console.log(`   ${config.description}`);
      const result = await runExperiment(config);
      results.push(result);

      for (const trial of result.trials) {
        const mark = trial.passed ? '✓' : '✗';
        const detail = trial.response_type === 'tool_call'
          ? `tool=${trial.tool_name}(${JSON.stringify(trial.params).slice(0, 80)})`
          : trial.response_type === 'error'
            ? `error: ${trial.error?.slice(0, 80)}`
            : `content: ${trial.raw_content?.slice(0, 80)}`;
        console.log(`   ${mark} trial ${trial.trial}: ${detail} (${trial.latency_ms}ms)`);
      }
      console.log(`   pass rate: ${Math.round(result.pass_rate * 100)}% — verdict: ${result.verdict}\n`);
    }

    // Summary
    const totalPass = results.filter(r => r.verdict === 'pass').length;
    const totalPartial = results.filter(r => r.verdict === 'partial').length;
    const totalFail = results.filter(r => r.verdict === 'fail').length;
    const overallRate = results.reduce((sum, r) => sum + r.pass_rate, 0) / results.length;
    console.log('--- Summary ---');
    console.log(`pass: ${totalPass}, partial: ${totalPartial}, fail: ${totalFail}`);
    console.log(`overall pass rate: ${Math.round(overallRate * 100)}%`);
    return;
  }

  console.log('Usage: tool-call-bench.ts [--health] [--dry-run] [--run <N|all>]');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { callWithTools, runExperiment, SAMPLE_TOOLS, type ExperimentConfig, type ExperimentResult, type TrialResult, type ToolDefinition };
