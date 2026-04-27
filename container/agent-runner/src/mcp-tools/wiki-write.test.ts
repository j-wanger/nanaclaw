import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const MOCK_WIKIS = {
  version: 1,
  wikis: [
    {
      name: 'aml-wiki',
      path: '', // set dynamically per test
      description: 'Anti-Money Laundering knowledge base covering fraud, TBML, sanctions, human trafficking, drug trafficking, and financial crime typologies.',
      registered: '2026-04-25',
      last_used: '2026-04-25',
    },
    {
      name: 'database-wiki',
      path: '',
      description: 'Practical knowledge base for local and embedded database systems — DuckDB, Kuzu, SQLite, LanceDB.',
      registered: '2026-04-25',
      last_used: '2026-04-25',
    },
    {
      name: 'agentic-engineering-wiki',
      path: '',
      description: 'Practical knowledge base for building AI agent systems — context engineering, harness design, workflow patterns.',
      registered: '2026-04-25',
      last_used: '2026-04-25',
    },
  ],
};

let tmpDir: string;
let wikisJsonPath: string;
let writeHandler: (args: Record<string, unknown>) => Promise<CallToolResult>;

function getText(result: CallToolResult): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-write-test-'));

  // Create wiki dirs with inbox/
  for (const wiki of MOCK_WIKIS.wikis) {
    const wikiDir = path.join(tmpDir, wiki.name);
    fs.mkdirSync(path.join(wikiDir, 'inbox'), { recursive: true });
    wiki.path = wikiDir;
  }

  wikisJsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(wikisJsonPath, JSON.stringify(MOCK_WIKIS));

  process.env.WIKIS_JSON_PATH = wikisJsonPath;

  const mod = await import('./wiki-write.js');
  writeHandler = mod.writeHandler;
});

afterEach(() => {
  delete process.env.WIKIS_JSON_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('wiki_write', () => {
  it('routes "AML fraud detection" topic to aml-wiki', async () => {
    const result = await writeHandler({
      title: 'AML Fraud Detection Patterns',
      content: 'Research findings about fraud typologies.',
      tags: ['aml', 'fraud'],
      topic: 'AML fraud detection and sanctions evasion',
    });
    const text = getText(result);

    expect(text).toContain('aml-wiki');

    const files = fs.readdirSync(path.join(tmpDir, 'aml-wiki', 'inbox'));
    expect(files.length).toBe(1);
    expect(files[0]).toEndWith('.md');
  });

  it('routes "SQLite optimization" to database-wiki', async () => {
    const result = await writeHandler({
      title: 'SQLite FTS5 Performance',
      content: 'Findings on FTS5 indexing strategies.',
      tags: ['sqlite', 'performance'],
      topic: 'SQLite optimization and DuckDB comparison',
    });
    const text = getText(result);

    expect(text).toContain('database-wiki');

    const files = fs.readdirSync(path.join(tmpDir, 'database-wiki', 'inbox'));
    expect(files.length).toBe(1);
  });

  it('explicit wiki_name overrides auto-routing', async () => {
    const result = await writeHandler({
      title: 'Agent Patterns',
      content: 'Some agent content that mentions AML.',
      tags: ['agents'],
      topic: 'AML fraud detection',
      wiki_name: 'agentic-engineering-wiki',
    });
    const text = getText(result);

    expect(text).toContain('agentic-engineering-wiki');

    const amlFiles = fs.readdirSync(path.join(tmpDir, 'aml-wiki', 'inbox'));
    expect(amlFiles.length).toBe(0);
    const aeFiles = fs.readdirSync(path.join(tmpDir, 'agentic-engineering-wiki', 'inbox'));
    expect(aeFiles.length).toBe(1);
  });

  it('unmatched topic falls back to first wiki', async () => {
    const result = await writeHandler({
      title: 'Quantum Computing Basics',
      content: 'Introduction to quantum gates.',
      tags: ['quantum'],
      topic: 'quantum computing qubits entanglement',
    });
    const text = getText(result);

    // Falls back to first wiki
    expect(text).toContain('aml-wiki');
  });

  it('output has valid YAML frontmatter with required fields', async () => {
    await writeHandler({
      title: 'Test Article',
      content: 'Body content here.',
      tags: ['test', 'research'],
      topic: 'AML testing',
    });

    const files = fs.readdirSync(path.join(tmpDir, 'aml-wiki', 'inbox'));
    const content = fs.readFileSync(path.join(tmpDir, 'aml-wiki', 'inbox', files[0]), 'utf8');

    expect(content).toMatch(/^---\n/);
    expect(content).toContain('title:');
    expect(content).toContain('tags:');
    expect(content).toContain('source:');
    expect(content).toContain('created:');
    expect(content).toContain('Body content here.');
  });

  it('returns error when wikis.json not found', async () => {
    process.env.WIKIS_JSON_PATH = '/nonexistent/wikis.json';

    const result = await writeHandler({
      title: 'Test',
      content: 'Body',
      tags: [],
      topic: 'anything',
    });
    const text = getText(result);

    expect(text).toContain('Error');
  });

  it('tier=episodic writes to episodic/ subdirectory not inbox/', async () => {
    const result = await writeHandler({
      title: 'Research Finding',
      content: 'Episodic research output.',
      tags: ['research'],
      topic: 'AML pattern analysis',
      tier: 'episodic',
    });
    const text = getText(result);

    expect(text).toContain('aml-wiki');
    expect(text).toContain('episodic/');

    const episodicFiles = fs.readdirSync(path.join(tmpDir, 'aml-wiki', 'episodic'));
    expect(episodicFiles.length).toBe(1);

    const inboxFiles = fs.readdirSync(path.join(tmpDir, 'aml-wiki', 'inbox'));
    expect(inboxFiles.length).toBe(0);
  });

  it('episodic frontmatter includes provenance fields', async () => {
    await writeHandler({
      title: 'Worker Research Output',
      content: 'Findings from worker.',
      tags: ['research'],
      topic: 'AML patterns',
      tier: 'episodic',
      worker_id: 'wt-123-abc',
      task_id: 'task-456-def',
    });

    const files = fs.readdirSync(path.join(tmpDir, 'aml-wiki', 'episodic'));
    const content = fs.readFileSync(path.join(tmpDir, 'aml-wiki', 'episodic', files[0]), 'utf8');

    expect(content).toContain('tier: episodic');
    expect(content).toContain('worker_id: wt-123-abc');
    expect(content).toContain('task_id: task-456-def');
    expect(content).toContain('source: worker-research');
  });

  it('default behavior (no tier) writes to inbox/ unchanged', async () => {
    await writeHandler({
      title: 'Standard Research',
      content: 'Normal inbox output.',
      tags: ['test'],
      topic: 'AML testing',
    });

    const inboxFiles = fs.readdirSync(path.join(tmpDir, 'aml-wiki', 'inbox'));
    expect(inboxFiles.length).toBe(1);

    const content = fs.readFileSync(path.join(tmpDir, 'aml-wiki', 'inbox', inboxFiles[0]), 'utf8');
    expect(content).toContain('source: web-research');
    expect(content).not.toContain('tier:');
    expect(content).not.toContain('worker_id:');
  });

  it('returns error when title missing', async () => {
    const result = await writeHandler({
      title: '',
      content: 'Body',
      tags: [],
      topic: 'test',
    });
    const text = getText(result);

    expect(text).toContain('required');
  });
});
