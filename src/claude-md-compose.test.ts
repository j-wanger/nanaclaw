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
    const skill = fs.readFileSync(
      path.join(process.cwd(), 'container', 'skills', 'memory', 'SKILL.md'),
      'utf-8',
    );
    expect(instructions).not.toContain('Coexistence');
    expect(skill).not.toMatch(/coexist/i);
  });

  it('memory skill declares sole authority', () => {
    const skill = fs.readFileSync(
      path.join(process.cwd(), 'container', 'skills', 'memory', 'SKILL.md'),
      'utf-8',
    );
    expect(skill).toMatch(/sole memory store/i);
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
