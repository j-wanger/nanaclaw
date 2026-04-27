import { type WorkerToolDefinition, executeTool } from './tool-registry.js';
import { routeTask, loadRoutingConfig, type RoutingConfig } from './routing.js';
import { Semaphore } from './semaphore.js';
import { AGENT_DIR } from '../../config.js';

export interface AgentLoopMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface AgentLoopConfig {
  messages: AgentLoopMessage[];
  tools: WorkerToolDefinition[];
  maxIterations: number;
  timeoutMs: number;
  taskType?: string;
}

export interface AgentLoopResult {
  output: string;
  iterations: number;
  toolTrace: ToolTraceEntry[];
  terminationReason: 'complete' | 'max_iterations' | 'timeout' | 'error';
  error?: string;
}

export interface ToolTraceEntry {
  iteration: number;
  tool: string;
  args: Record<string, unknown>;
  result: string;
  latency_ms: number;
}

let _routingConfig: RoutingConfig | null | undefined;
const _semaphores = new Map<string, Semaphore>();

function getRoutingConfig(): RoutingConfig | null {
  if (_routingConfig === undefined) {
    const configPath = `${process.env.NANOCLAW_AGENT_DIR || AGENT_DIR}/container.json`;
    _routingConfig = loadRoutingConfig(configPath);
  }
  return _routingConfig;
}

function getSemaphore(url: string): Semaphore {
  let sem = _semaphores.get(url);
  if (!sem) {
    const config = getRoutingConfig();
    const maxConcurrent = config?.endpoints[url]?.max_concurrent ?? 1;
    sem = new Semaphore(maxConcurrent);
    _semaphores.set(url, sem);
  }
  return sem;
}

function generateToolCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatMessages(messages: AgentLoopMessage[]): unknown[] {
  return messages.map(m => {
    const msg: Record<string, unknown> = { role: m.role, content: m.content };
    if (m.tool_calls) msg.tool_calls = m.tool_calls;
    if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
    return msg;
  });
}

export async function executeAgentLoop(config: AgentLoopConfig): Promise<AgentLoopResult> {
  const { tools, maxIterations, timeoutMs, taskType } = config;
  const messages = [...config.messages];
  const toolTrace: ToolTraceEntry[] = [];
  const deadline = Date.now() + timeoutMs;
  const url = routeTask(taskType || 'research', getRoutingConfig());

  let iteration = 0;

  while (iteration < maxIterations) {
    if (Date.now() >= deadline) {
      const partialOutput = extractLastContent(messages);
      return {
        output: partialOutput || `[timeout after ${iteration} iterations]`,
        iterations: iteration,
        toolTrace,
        terminationReason: 'timeout',
      };
    }

    iteration++;

    const release = await getSemaphore(url).acquire();
    let responseMessage: Record<string, unknown>;

    try {
      const controller = new AbortController();
      const remainingMs = Math.max(deadline - Date.now(), 1000);
      const timer = setTimeout(() => controller.abort(), remainingMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formatMessages(messages),
          tools,
          tool_choice: 'auto',
          temperature: 0,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return {
          output: `[HTTP error ${response.status}: ${errText.slice(0, 200)}]`,
          iterations: iteration,
          toolTrace,
          terminationReason: 'error',
          error: `HTTP ${response.status}`,
        };
      }

      const body = await response.json() as { choices: Array<{ message: Record<string, unknown> }> };
      responseMessage = body.choices?.[0]?.message ?? {};
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      const partialOutput = extractLastContent(messages);
      return {
        output: partialOutput || `[${isTimeout ? 'timeout' : 'error'} at iteration ${iteration}]`,
        iterations: iteration,
        toolTrace,
        terminationReason: isTimeout ? 'timeout' : 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      release();
    }

    const toolCalls = responseMessage.tool_calls as ToolCall[] | undefined;

    if (!toolCalls || toolCalls.length === 0) {
      const content = (responseMessage.content as string) || '';
      return {
        output: content,
        iterations: iteration,
        toolTrace,
        terminationReason: 'complete',
      };
    }

    // Add assistant message with tool calls to history
    messages.push({
      role: 'assistant',
      content: (responseMessage.content as string) || '',
      tool_calls: toolCalls,
    });

    // Execute each tool call and add results
    for (const call of toolCalls) {
      const fnName = call.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        args = { _raw: call.function.arguments };
      }

      const toolStart = performance.now();
      let resultText: string;

      try {
        const result = await executeTool(fnName, args);
        const textContent = result.content.find(c => 'text' in c);
        resultText = textContent && 'text' in textContent ? textContent.text : JSON.stringify(result.content);
      } catch (err) {
        resultText = `Error executing ${fnName}: ${err instanceof Error ? err.message : String(err)}`;
      }

      const toolLatency = Math.round(performance.now() - toolStart);
      toolTrace.push({ iteration, tool: fnName, args, result: resultText.slice(0, 2000), latency_ms: toolLatency });

      messages.push({
        role: 'tool',
        content: resultText,
        tool_call_id: call.id || generateToolCallId(),
      });
    }
  }

  // max_iterations reached
  const partialOutput = extractLastContent(messages);
  return {
    output: partialOutput || `[max iterations reached: ${maxIterations}]`,
    iterations: iteration,
    toolTrace,
    terminationReason: 'max_iterations',
  };
}

function extractLastContent(messages: AgentLoopMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].content) {
      return messages[i].content;
    }
  }
  return '';
}
