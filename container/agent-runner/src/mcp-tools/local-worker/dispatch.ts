import path from 'path';

import { AGENT_DIR } from '../../config.js';
import type { TaskContract, TaskState } from './contract.js';
import { writeTaskState } from './contract.js';
import { executeAgentLoop, type AgentLoopResult } from './agent-loop.js';
import { buildToolDefinitions } from './tool-registry.js';
import { buildWorkerPrompt } from './prompt-builder.js';
import { parseWorkerResult } from './result-parser.js';
import { routeTask, loadRoutingConfig, type RoutingConfig } from './routing.js';
import { Semaphore } from './semaphore.js';
import { verify } from './verification.js';

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

export async function executeWorkerTask(contract: TaskContract, resultsDir: string): Promise<void> {
  if (contract.tools && contract.tools.length > 0) {
    return executeToolCallingWorker(contract, resultsDir);
  }
  return executeSingleShotWorker(contract, resultsDir);
}

async function executeToolCallingWorker(contract: TaskContract, resultsDir: string): Promise<void> {
  const resultPath = path.join(resultsDir, `${contract.id}.json`);
  const prompt = buildWorkerPrompt(contract);
  const { definitions, errors } = buildToolDefinitions(contract.tools!);

  if (errors.length > 0) {
    const state: TaskState = {
      contract,
      status: 'failed',
      created_at: new Date().toISOString(),
      error: `Tool registry errors: ${errors.join(', ')}`,
    };
    writeTaskState(resultPath, state);
    return;
  }

  const maxIterations = 6;

  let loopResult: AgentLoopResult;
  try {
    loopResult = await executeAgentLoop({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      tools: definitions,
      maxIterations,
      timeoutMs: contract.timeout_ms,
      taskType: contract.type,
    });
  } catch (err) {
    const state: TaskState = {
      contract,
      status: 'failed',
      created_at: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
    writeTaskState(resultPath, state);
    return;
  }

  const raw = loopResult.output;
  const parseResult = parseWorkerResult(raw, contract.outputFormat);
  const parsed = parseResult.ok ? parseResult.parsed : raw;
  const verification = verify(parsed, contract.postconditions, contract.outputFormat);

  const isTimeout = loopResult.terminationReason === 'timeout';
  const isError = loopResult.terminationReason === 'error';

  const state: TaskState = {
    contract,
    status: isTimeout ? 'timeout' : isError ? 'failed' : parseResult.ok ? 'completed' : 'failed',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    result: { raw, parsed },
    verification,
    ...(parseResult.ok && !isTimeout && !isError ? {} : { error: (!parseResult.ok ? parseResult.error : undefined) || loopResult.error || loopResult.terminationReason }),
  };

  writeTaskState(resultPath, state);
}

async function executeSingleShotWorker(contract: TaskContract, resultsDir: string): Promise<void> {
  const resultPath = path.join(resultsDir, `${contract.id}.json`);
  const prompt = buildWorkerPrompt(contract);
  const url = routeTask(contract.type, getRoutingConfig());
  const release = await getSemaphore(url).acquire();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), contract.timeout_ms);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const state: TaskState = {
        contract,
        status: 'failed',
        created_at: new Date().toISOString(),
        error: `HTTP ${response.status}: ${errText.slice(0, 500)}`,
      };
      writeTaskState(resultPath, state);
      return;
    }

    const body = await response.json() as { choices: Array<{ message: { content: string } }> };
    const raw = body.choices?.[0]?.message?.content ?? '';

    const parseResult = parseWorkerResult(raw, contract.outputFormat);
    const parsed = parseResult.ok ? parseResult.parsed : raw;
    const verification = verify(parsed, contract.postconditions, contract.outputFormat);

    const state: TaskState = {
      contract,
      status: parseResult.ok ? 'completed' : 'failed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      result: { raw, parsed },
      verification,
      ...(parseResult.ok ? {} : { error: parseResult.error }),
    };

    writeTaskState(resultPath, state);
  } catch (err) {
    clearTimeout(timer);

    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const state: TaskState = {
      contract,
      status: isAbort ? 'timeout' : 'failed',
      created_at: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };

    writeTaskState(resultPath, state);
  } finally {
    release();
  }
}
