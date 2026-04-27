import { describe, expect, it } from 'vitest';

import { resolveProviderName, buildHostRunnerEnv } from './container-runner.js';

describe('resolveProviderName', () => {
  it('prefers session over group and container.json', () => {
    expect(resolveProviderName('codex', 'opencode', 'claude')).toBe('codex');
  });

  it('falls back to group when session is null', () => {
    expect(resolveProviderName(null, 'codex', 'claude')).toBe('codex');
  });

  it('falls back to container.json when session and group are null', () => {
    expect(resolveProviderName(null, null, 'opencode')).toBe('opencode');
  });

  it('defaults to claude when nothing is set', () => {
    expect(resolveProviderName(null, null, undefined)).toBe('claude');
  });

  it('lowercases the resolved name', () => {
    expect(resolveProviderName('CODEX', null, null)).toBe('codex');
    expect(resolveProviderName(null, 'OpenCode', null)).toBe('opencode');
    expect(resolveProviderName(null, null, 'Claude')).toBe('claude');
  });

  it('treats empty string as unset (falls through)', () => {
    expect(resolveProviderName('', 'codex', null)).toBe('codex');
    expect(resolveProviderName(null, '', 'opencode')).toBe('opencode');
  });

  it('resolves host provider from container.json', () => {
    expect(resolveProviderName(null, null, 'host')).toBe('host');
  });

  it('session-level host override takes precedence', () => {
    expect(resolveProviderName('host', 'claude', 'claude')).toBe('host');
  });
});

describe('buildHostRunnerEnv', () => {
  it('sets NANOCLAW_SESSION_DIR and NANOCLAW_AGENT_DIR', () => {
    const env = buildHostRunnerEnv({
      sessionDir: '/data/v2-sessions/grp/sess1',
      agentDir: '/groups/myagent',
      timezone: 'America/New_York',
    });
    expect(env.NANOCLAW_SESSION_DIR).toBe('/data/v2-sessions/grp/sess1');
    expect(env.NANOCLAW_AGENT_DIR).toBe('/groups/myagent');
  });

  it('sets TZ from timezone param', () => {
    const env = buildHostRunnerEnv({
      sessionDir: '/tmp/sess',
      agentDir: '/tmp/agent',
      timezone: 'Asia/Tokyo',
    });
    expect(env.TZ).toBe('Asia/Tokyo');
  });

  it('inherits host process.env (PATH must be present)', () => {
    const env = buildHostRunnerEnv({
      sessionDir: '/tmp/sess',
      agentDir: '/tmp/agent',
      timezone: 'UTC',
    });
    expect(env.PATH).toBeDefined();
  });

  it('merges extra env vars without clobbering core vars', () => {
    const env = buildHostRunnerEnv({
      sessionDir: '/tmp/sess',
      agentDir: '/tmp/agent',
      timezone: 'UTC',
      extraEnv: { CUSTOM_VAR: 'hello', ANOTHER: 'world' },
    });
    expect(env.CUSTOM_VAR).toBe('hello');
    expect(env.ANOTHER).toBe('world');
    expect(env.NANOCLAW_SESSION_DIR).toBe('/tmp/sess');
  });

  it('NanoClaw vars override extraEnv if conflicting', () => {
    const env = buildHostRunnerEnv({
      sessionDir: '/correct/path',
      agentDir: '/tmp/agent',
      timezone: 'UTC',
      extraEnv: { NANOCLAW_SESSION_DIR: '/wrong/path' },
    });
    expect(env.NANOCLAW_SESSION_DIR).toBe('/correct/path');
  });
});
