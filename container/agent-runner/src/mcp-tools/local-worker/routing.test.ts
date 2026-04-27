import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { routeTask, loadRoutingConfig } from './routing.js';

describe('loadRoutingConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routing-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses localWorker config from container.json', () => {
    const config = {
      provider: 'claude',
      assistantName: 'test',
      groupName: 'test',
      agentGroupId: 'ag-123',
      maxMessagesPerPrompt: 10,
      mcpServers: {},
      localWorker: {
        routes: {
          'code-impl': 'http://localhost:8080/v1/chat/completions',
          'research': 'http://localhost:8081/v1/chat/completions',
        },
        endpoints: {
          'http://localhost:8080/v1/chat/completions': { max_concurrent: 1 },
          'http://localhost:8081/v1/chat/completions': { max_concurrent: 2 },
        },
      },
    };
    fs.writeFileSync(path.join(tmpDir, 'container.json'), JSON.stringify(config));

    const result = loadRoutingConfig(path.join(tmpDir, 'container.json'));
    expect(result).not.toBeNull();
    expect(result!.routes['code-impl']).toBe('http://localhost:8080/v1/chat/completions');
    expect(result!.endpoints['http://localhost:8081/v1/chat/completions'].max_concurrent).toBe(2);
  });

  it('returns null when no localWorker field', () => {
    const config = { provider: 'claude', mcpServers: {} };
    fs.writeFileSync(path.join(tmpDir, 'container.json'), JSON.stringify(config));

    const result = loadRoutingConfig(path.join(tmpDir, 'container.json'));
    expect(result).toBeNull();
  });

  it('returns null when container.json missing', () => {
    const result = loadRoutingConfig(path.join(tmpDir, 'container.json'));
    expect(result).toBeNull();
  });
});

describe('routeTask', () => {
  it('returns configured URL for mapped task type', () => {
    const config = {
      routes: {
        'code-impl': 'http://localhost:8080/v1/chat/completions',
        'research': 'http://localhost:8081/v1/chat/completions',
      },
      endpoints: {
        'http://localhost:8080/v1/chat/completions': { max_concurrent: 1 },
        'http://localhost:8081/v1/chat/completions': { max_concurrent: 2 },
      },
    };

    expect(routeTask('code-impl', config)).toBe('http://localhost:8080/v1/chat/completions');
    expect(routeTask('research', config)).toBe('http://localhost:8081/v1/chat/completions');
  });

  it('returns LLAMA_CPP_URL for unmapped task type even when config exists', () => {
    const config = {
      routes: { 'code-impl': 'http://localhost:9999/v1/chat/completions' },
      endpoints: { 'http://localhost:9999/v1/chat/completions': { max_concurrent: 1 } },
    };

    const result = routeTask('research', config);
    expect(result).toBe('http://localhost:8080/v1/chat/completions');
  });

  it('returns LLAMA_CPP_URL default when config is null', () => {
    const result = routeTask('code-impl', null);
    expect(result).toBe('http://localhost:8080/v1/chat/completions');
  });
});
