import fs from 'fs';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { composeGroupClaudeMd } from './claude-md-compose.js';
import type { AgentGroup } from './types.js';

const TEST_FOLDER = '_test-compose';
const groupDir = path.resolve(process.cwd(), 'groups', TEST_FOLDER);
const fragmentsDir = path.join(groupDir, '.claude-fragments');

function makeGroup(folder = TEST_FOLDER): AgentGroup {
  return { id: 'test-id', name: 'Test', folder, agent_provider: null, created_at: '' };
}

beforeEach(() => {
  fs.mkdirSync(groupDir, { recursive: true });
  fs.writeFileSync(path.join(groupDir, 'container.json'), JSON.stringify({ mcpServers: {} }));
});

afterEach(() => {
  fs.rmSync(groupDir, { recursive: true, force: true });
});

describe('composeGroupClaudeMd', () => {
  it('creates soul.md fragment from SOUL.md', () => {
    composeGroupClaudeMd(makeGroup());

    const soulPath = path.join(fragmentsDir, 'soul.md');
    expect(fs.existsSync(soulPath)).toBe(true);

    const content = fs.readFileSync(soulPath, 'utf-8');
    const soulMd = fs.readFileSync(path.join(process.cwd(), 'SOUL.md'), 'utf-8');
    expect(content).toBe(soulMd);
  });

  it('includes soul.md in composed CLAUDE.md imports', () => {
    composeGroupClaudeMd(makeGroup());

    const composed = fs.readFileSync(path.join(groupDir, 'CLAUDE.md'), 'utf-8');
    expect(composed).toContain('@./.claude-fragments/soul.md');
  });

  it('creates CLAUDE.local.md if missing', () => {
    composeGroupClaudeMd(makeGroup());
    expect(fs.existsSync(path.join(groupDir, 'CLAUDE.local.md'))).toBe(true);
  });

  it('includes memory skill fragment when skill exists', () => {
    composeGroupClaudeMd(makeGroup());

    const composed = fs.readFileSync(path.join(groupDir, 'CLAUDE.md'), 'utf-8');
    expect(composed).toContain('skill-memory.md');
  });
});

describe('host-mode fragment resolution', () => {
  beforeEach(() => {
    fs.writeFileSync(path.join(groupDir, 'container.json'), JSON.stringify({ provider: 'host', mcpServers: {} }));
  });

  it('fragment symlinks resolve to real files when provider=host', () => {
    composeGroupClaudeMd(makeGroup());

    for (const entry of fs.readdirSync(fragmentsDir)) {
      const fragPath = path.join(fragmentsDir, entry);
      const stat = fs.lstatSync(fragPath);
      if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(fragPath);
        expect(fs.existsSync(target), `${entry} → ${target}`).toBe(true);
      }
    }
  });

  it('.claude-shared.md resolves to container/CLAUDE.md', () => {
    composeGroupClaudeMd(makeGroup());

    const sharedLink = path.join(groupDir, '.claude-shared.md');
    const target = fs.readlinkSync(sharedLink);
    expect(target).toContain(path.join('container', 'CLAUDE.md'));
    expect(fs.existsSync(target)).toBe(true);
  });

  it('skill fragment targets use host paths (not /app/)', () => {
    composeGroupClaudeMd(makeGroup());

    const memoryFrag = path.join(fragmentsDir, 'skill-memory.md');
    expect(fs.lstatSync(memoryFrag).isSymbolicLink()).toBe(true);
    const target = fs.readlinkSync(memoryFrag);
    expect(target).not.toContain('/app/');
    expect(target).toContain(path.join('container', 'skills', 'memory'));
  });

  it('module fragment targets use host paths (not /app/)', () => {
    composeGroupClaudeMd(makeGroup());

    const coreFrag = path.join(fragmentsDir, 'module-core.md');
    expect(fs.lstatSync(coreFrag).isSymbolicLink()).toBe(true);
    const target = fs.readlinkSync(coreFrag);
    expect(target).not.toContain('/app/');
    expect(target).toContain(path.join('container', 'agent-runner', 'src', 'mcp-tools'));
  });
});

describe('host-mode fragment readability', () => {
  beforeEach(() => {
    fs.writeFileSync(path.join(groupDir, 'container.json'), JSON.stringify({ provider: 'host', mcpServers: {} }));
  });

  it('every fragment entry resolves to a non-empty file', () => {
    composeGroupClaudeMd(makeGroup());

    const entries = fs.readdirSync(fragmentsDir);
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      const fragPath = path.join(fragmentsDir, entry);
      const content = fs.readFileSync(fragPath, 'utf-8');
      expect(content.length, `${entry} should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('inline fragments (soul.md) are non-empty', () => {
    composeGroupClaudeMd(makeGroup());

    const soulPath = path.join(fragmentsDir, 'soul.md');
    expect(fs.existsSync(soulPath)).toBe(true);
    const content = fs.readFileSync(soulPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });
});

describe('container-mode fragment paths unchanged', () => {
  it('fragment symlinks target /app/ when provider is not host', () => {
    composeGroupClaudeMd(makeGroup());

    const memoryFrag = path.join(fragmentsDir, 'skill-memory.md');
    const target = fs.readlinkSync(memoryFrag);
    expect(target).toContain('/app/skills/');
  });

  it('.claude-shared.md targets /app/CLAUDE.md when provider is not host', () => {
    composeGroupClaudeMd(makeGroup());

    const sharedLink = path.join(groupDir, '.claude-shared.md');
    const target = fs.readlinkSync(sharedLink);
    expect(target).toBe('/app/CLAUDE.md');
  });
});

describe('compose coherence', () => {
  it('shared base has no hardcoded Docker workspace paths', () => {
    const base = fs.readFileSync(path.join(process.cwd(), 'container', 'CLAUDE.md'), 'utf-8');
    expect(base).not.toContain('/workspace/agent');
  });

  it('shared base has no CLAUDE.local.md memory authority', () => {
    const base = fs.readFileSync(path.join(process.cwd(), 'container', 'CLAUDE.md'), 'utf-8');
    expect(base).not.toMatch(/put into CLAUDE\.local\.md/i);
    expect(base).not.toMatch(/CLAUDE\.local\.md.*is your.*memory/i);
    expect(base).not.toMatch(/store.*information.*CLAUDE\.local\.md/i);
  });

  it('shared base directs CLAUDE.local.md to personality/config only', () => {
    const base = fs.readFileSync(path.join(process.cwd(), 'container', 'CLAUDE.md'), 'utf-8');
    expect(base).toContain('CLAUDE.local.md');
    expect(base).toMatch(/personality|config/i);
  });

  it('memory skill has no coexistence hedging', () => {
    const instructions = fs.readFileSync(
      path.join(process.cwd(), 'container', 'skills', 'memory', 'instructions.md'),
      'utf-8',
    );
    const skill = fs.readFileSync(path.join(process.cwd(), 'container', 'skills', 'memory', 'SKILL.md'), 'utf-8');
    expect(instructions).not.toContain('Coexistence');
    expect(skill).not.toMatch(/coexist/i);
  });

  it('memory skill declares primary write path', () => {
    const skill = fs.readFileSync(path.join(process.cwd(), 'container', 'skills', 'memory', 'SKILL.md'), 'utf-8');
    expect(skill).toMatch(/memory_store/);
  });

  it('no /workspace/agent in container skill files', () => {
    const skillsDir = path.join(process.cwd(), 'container', 'skills');
    for (const skill of fs.readdirSync(skillsDir)) {
      const skillDir = path.join(skillsDir, skill);
      if (!fs.statSync(skillDir).isDirectory()) continue;
      for (const file of fs.readdirSync(skillDir)) {
        if (!file.endsWith('.md')) continue;
        const content = fs.readFileSync(path.join(skillDir, file), 'utf-8');
        expect(content, `${skill}/${file}`).not.toContain('/workspace/agent');
      }
    }
  });
});
