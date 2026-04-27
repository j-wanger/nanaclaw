import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { loadModels, buildLocalWorkerConfig, type ModelConfig } from './model-registry.js';

describe('loadModels', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses a valid models.json with multiple models', () => {
    const models: ModelConfig[] = [
      {
        name: 'qwen-35b',
        url: 'http://localhost:8080/v1/chat/completions',
        max_concurrent: 1,
        task_types: ['code-impl', 'file-op'],
      },
      {
        name: 'qwen-7b',
        url: 'http://localhost:8081/v1/chat/completions',
        max_concurrent: 2,
        task_types: ['research', 'structured-output'],
      },
    ];
    fs.writeFileSync(path.join(tmpDir, 'models.json'), JSON.stringify(models));

    const result = loadModels(tmpDir);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('qwen-35b');
    expect(result[0].task_types).toEqual(['code-impl', 'file-op']);
    expect(result[1].name).toBe('qwen-7b');
    expect(result[1].max_concurrent).toBe(2);
  });

  it('returns empty array when models.json does not exist', () => {
    const result = loadModels(tmpDir);
    expect(result).toEqual([]);
  });

  it('returns empty array when models.json is malformed', () => {
    fs.writeFileSync(path.join(tmpDir, 'models.json'), 'not json');
    const result = loadModels(tmpDir);
    expect(result).toEqual([]);
  });
});

describe('buildLocalWorkerConfig', () => {
  it('produces routing table mapping task types to URLs', () => {
    const models: ModelConfig[] = [
      {
        name: 'qwen-35b',
        url: 'http://localhost:8080/v1/chat/completions',
        max_concurrent: 1,
        task_types: ['code-impl', 'file-op'],
      },
      {
        name: 'qwen-7b',
        url: 'http://localhost:8081/v1/chat/completions',
        max_concurrent: 2,
        task_types: ['research', 'structured-output'],
      },
    ];

    const config = buildLocalWorkerConfig(models);

    expect(config.routes['code-impl']).toBe('http://localhost:8080/v1/chat/completions');
    expect(config.routes['file-op']).toBe('http://localhost:8080/v1/chat/completions');
    expect(config.routes['research']).toBe('http://localhost:8081/v1/chat/completions');
    expect(config.routes['structured-output']).toBe('http://localhost:8081/v1/chat/completions');
  });

  it('includes max_concurrent per endpoint', () => {
    const models: ModelConfig[] = [
      {
        name: 'qwen-35b',
        url: 'http://localhost:8080/v1/chat/completions',
        max_concurrent: 1,
        task_types: ['code-impl'],
      },
      {
        name: 'qwen-7b',
        url: 'http://localhost:8081/v1/chat/completions',
        max_concurrent: 3,
        task_types: ['research'],
      },
    ];

    const config = buildLocalWorkerConfig(models);

    expect(config.endpoints['http://localhost:8080/v1/chat/completions']).toEqual({ max_concurrent: 1 });
    expect(config.endpoints['http://localhost:8081/v1/chat/completions']).toEqual({ max_concurrent: 3 });
  });

  it('returns empty config when no models provided', () => {
    const config = buildLocalWorkerConfig([]);
    expect(config.routes).toEqual({});
    expect(config.endpoints).toEqual({});
  });

  it('last model wins when task types overlap', () => {
    const models: ModelConfig[] = [
      {
        name: 'model-a',
        url: 'http://localhost:8080/v1/chat/completions',
        max_concurrent: 1,
        task_types: ['code-impl'],
      },
      {
        name: 'model-b',
        url: 'http://localhost:8081/v1/chat/completions',
        max_concurrent: 1,
        task_types: ['code-impl'],
      },
    ];

    const config = buildLocalWorkerConfig(models);
    expect(config.routes['code-impl']).toBe('http://localhost:8081/v1/chat/completions');
  });
});
