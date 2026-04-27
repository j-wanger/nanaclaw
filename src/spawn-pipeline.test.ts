import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { composeGroupClaudeMd } from './claude-md-compose.js';
import { buildHostRunnerEnv } from './container-runner.js';
import { generateMemoryFragment } from './modules/memory/context-builder.js';
import { generateWikiContext } from './modules/memory/wiki-bridge.js';
import type { AgentGroup } from './types.js';

interface SpawnFixture {
  tmpDir: string;
  groupDir: string;
  wikisJsonPath: string;
}

function createSpawnFixture(): SpawnFixture {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn-test-'));
  const groupDir = path.join(tmpDir, 'group');
  const memoryDir = path.join(groupDir, 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });

  fs.writeFileSync(
    path.join(memoryDir, 'MEMORY.md'),
    '# Memory\n\n## [user] Test User (2026-04-26)\nSenior engineer, prefers terse responses\n\n## [project] NanaClaw (2026-04-26)\nPersonal AI assistant\n',
  );

  const wikiDir = path.join(tmpDir, 'test-wiki');
  const articlesDir = path.join(wikiDir, 'articles', 'concepts');
  fs.mkdirSync(articlesDir, { recursive: true });
  fs.writeFileSync(
    path.join(wikiDir, 'schema.md'),
    '---\ndomain: Test\n---\n\n# Wiki Schema\n\n## Hierarchy Roots\n- testing\n- automation\n',
  );
  fs.writeFileSync(
    path.join(articlesDir, 'test-article.md'),
    '---\ntitle: "Test Article"\ntags: ["testing"]\n---\n\nContent.\n',
  );

  const wikisJsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(
    wikisJsonPath,
    JSON.stringify({
      version: 1,
      wikis: [{ name: 'test-wiki', path: wikiDir, description: 'Smoke test wiki.' }],
    }),
  );

  return { tmpDir, groupDir, wikisJsonPath };
}

function cleanupFixture(fixture: SpawnFixture): void {
  fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
}

describe('spawn pipeline: memory fragment', () => {
  let fixture: SpawnFixture;

  beforeEach(() => {
    fixture = createSpawnFixture();
  });
  afterEach(() => cleanupFixture(fixture));

  it('generates memory-context.md from MEMORY.md', () => {
    generateMemoryFragment(fixture.groupDir);

    const fragPath = path.join(fixture.groupDir, '.claude-fragments', 'memory-context.md');
    expect(fs.existsSync(fragPath)).toBe(true);

    const content = fs.readFileSync(fragPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('Test User');
  });

  it('includes project entries', () => {
    generateMemoryFragment(fixture.groupDir);

    const fragPath = path.join(fixture.groupDir, '.claude-fragments', 'memory-context.md');
    const content = fs.readFileSync(fragPath, 'utf-8');
    expect(content).toContain('NanaClaw');
  });
});

describe('spawn pipeline: wiki context', () => {
  let fixture: SpawnFixture;

  beforeEach(() => {
    fixture = createSpawnFixture();
  });
  afterEach(() => cleanupFixture(fixture));

  it('generates wiki-context.md from wikis.json', () => {
    generateWikiContext(fixture.groupDir, fixture.wikisJsonPath);

    const fragPath = path.join(fixture.groupDir, '.claude-fragments', 'wiki-context.md');
    expect(fs.existsSync(fragPath)).toBe(true);

    const content = fs.readFileSync(fragPath, 'utf-8');
    expect(content).toContain('test-wiki');
  });

  it('includes hierarchy roots from schema.md', () => {
    generateWikiContext(fixture.groupDir, fixture.wikisJsonPath);

    const fragPath = path.join(fixture.groupDir, '.claude-fragments', 'wiki-context.md');
    const content = fs.readFileSync(fragPath, 'utf-8');
    expect(content).toContain('testing');
  });

  it('includes article count', () => {
    generateWikiContext(fixture.groupDir, fixture.wikisJsonPath);

    const fragPath = path.join(fixture.groupDir, '.claude-fragments', 'wiki-context.md');
    const content = fs.readFileSync(fragPath, 'utf-8');
    expect(content).toContain('1 articles');
  });
});

describe('spawn pipeline: host env', () => {
  it('sets required environment variables', () => {
    const env = buildHostRunnerEnv({
      sessionDir: '/tmp/test-session',
      agentDir: '/tmp/test-agent',
      timezone: 'America/Toronto',
    });

    expect(env.NANOCLAW_SESSION_DIR).toBe('/tmp/test-session');
    expect(env.NANOCLAW_AGENT_DIR).toBe('/tmp/test-agent');
    expect(env.TZ).toBe('America/Toronto');
  });

  it('inherits host PATH', () => {
    const env = buildHostRunnerEnv({
      sessionDir: '/tmp/s',
      agentDir: '/tmp/a',
      timezone: 'UTC',
    });
    expect(env.PATH).toBeDefined();
  });
});

describe('spawn pipeline: compose integration', () => {
  const TEST_FOLDER = '_test-spawn-pipeline';
  const groupDir = path.resolve(process.cwd(), 'groups', TEST_FOLDER);

  function makeGroup(): AgentGroup {
    return { id: 'spawn-test', name: 'SpawnTest', folder: TEST_FOLDER, agent_provider: null, created_at: '' };
  }

  beforeEach(() => {
    fs.mkdirSync(groupDir, { recursive: true });
    fs.writeFileSync(path.join(groupDir, 'container.json'), JSON.stringify({ mcpServers: {} }));
    const memoryDir = path.join(groupDir, 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, 'MEMORY.md'),
      '# Memory\n\n## [user] Integration Test (2026-04-27)\nTesting spawn pipeline\n',
    );
  });

  afterEach(() => {
    fs.rmSync(groupDir, { recursive: true, force: true });
  });

  it('compose + memory produce fragments in the same group dir', () => {
    composeGroupClaudeMd(makeGroup());
    generateMemoryFragment(groupDir);

    const fragmentsDir = path.join(groupDir, '.claude-fragments');
    expect(fs.existsSync(path.join(fragmentsDir, 'soul.md'))).toBe(true);
    expect(fs.existsSync(path.join(fragmentsDir, 'memory-context.md'))).toBe(true);

    const composed = fs.readFileSync(path.join(groupDir, 'CLAUDE.md'), 'utf-8');
    expect(composed).toContain('@./.claude-fragments/soul.md');
  });
});

describe('spawn pipeline: project structure', () => {
  const requiredFiles = [
    'src/modules/memory/context-builder.ts',
    'src/modules/memory/wiki-bridge.ts',
    'src/modules/memory/index.ts',
    'container/agent-runner/src/mcp-tools/wiki-search.ts',
    'container/agent-runner/src/mcp-tools/wiki-write.ts',
    'container/skills/memory/SKILL.md',
  ];

  for (const file of requiredFiles) {
    it(`requires ${file}`, () => {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
    });
  }
});
