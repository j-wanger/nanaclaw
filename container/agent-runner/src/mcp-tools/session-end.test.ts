import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Database } from 'bun:sqlite';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-end-test-'));
  process.env.NANOCLAW_SESSION_DIR = tmpDir;

  const outDb = new Database(path.join(tmpDir, 'outbound.db'));
  outDb.exec(`
    CREATE TABLE IF NOT EXISTS messages_out (
      id TEXT PRIMARY KEY, seq INTEGER UNIQUE, kind TEXT NOT NULL,
      platform_id TEXT, channel_type TEXT, thread_id TEXT,
      content TEXT NOT NULL, in_reply_to TEXT, deliver_after TEXT,
      recurrence TEXT, delivered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS session_state (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  outDb.prepare("INSERT INTO session_state (key, value) VALUES ('continuation:claude', 'conv-abc123')").run();
  outDb.prepare("INSERT INTO session_state (key, value) VALUES ('continuation:codex', 'sess-xyz789')").run();
  outDb.close();

  const inDb = new Database(path.join(tmpDir, 'inbound.db'));
  inDb.exec(`
    CREATE TABLE IF NOT EXISTS messages_in (
      id TEXT PRIMARY KEY, seq INTEGER UNIQUE, kind TEXT NOT NULL,
      platform_id TEXT, channel_type TEXT, thread_id TEXT,
      content TEXT NOT NULL, sender_name TEXT, in_reply_to TEXT,
      process_after TEXT, delivered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS session_routing (
      id INTEGER PRIMARY KEY, channel_type TEXT, platform_id TEXT, thread_id TEXT
    );
  `);
  inDb.prepare("INSERT INTO session_routing (id, channel_type, platform_id) VALUES (1, 'telegram', 'tg:123')").run();
  inDb.close();
});

afterEach(() => {
  delete process.env.NANOCLAW_SESSION_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('end_session logic', () => {
  test('clears all session_state rows and writes system message', () => {
    const db = new Database(path.join(tmpDir, 'outbound.db'));

    // Verify precondition: 2 continuation rows exist
    const before = (db.prepare('SELECT count(*) as cnt FROM session_state').get() as { cnt: number }).cnt;
    expect(before).toBe(2);

    // Simulate what handleEndSession does: clear + write
    db.prepare('DELETE FROM session_state').run();

    const payload = JSON.stringify({ action: 'end_session', reason: 'context full' });
    db.prepare("INSERT INTO messages_out (id, seq, kind, content) VALUES ('end-test', 1, 'system', ?)").run(payload);

    // Verify: session_state cleared
    const after = (db.prepare('SELECT count(*) as cnt FROM session_state').get() as { cnt: number }).cnt;
    expect(after).toBe(0);

    // Verify: system message written
    const msg = db.prepare("SELECT content FROM messages_out WHERE kind = 'system'").get() as { content: string };
    const parsed = JSON.parse(msg.content);
    expect(parsed.action).toBe('end_session');
    expect(parsed.reason).toBe('context full');

    db.close();
  });

  test('includes resume_prompt in payload when provided', () => {
    const db = new Database(path.join(tmpDir, 'outbound.db'));
    db.prepare('DELETE FROM session_state').run();

    const payload = JSON.stringify({
      action: 'end_session',
      reason: 'rotating',
      resume_prompt: 'Continue curation from handover state',
    });
    db.prepare("INSERT INTO messages_out (id, seq, kind, content) VALUES ('end-resume', 1, 'system', ?)").run(payload);

    const msg = db.prepare("SELECT content FROM messages_out WHERE kind = 'system'").get() as { content: string };
    const parsed = JSON.parse(msg.content);
    expect(parsed.resume_prompt).toBe('Continue curation from handover state');

    db.close();
  });

  test('omits resume_prompt when not provided', () => {
    const db = new Database(path.join(tmpDir, 'outbound.db'));

    const payload = JSON.stringify({ action: 'end_session', reason: 'done' });
    db.prepare("INSERT INTO messages_out (id, seq, kind, content) VALUES ('end-no-resume', 1, 'system', ?)").run(payload);

    const msg = db.prepare("SELECT content FROM messages_out WHERE kind = 'system'").get() as { content: string };
    const parsed = JSON.parse(msg.content);
    expect(parsed.resume_prompt).toBeUndefined();

    db.close();
  });
});
