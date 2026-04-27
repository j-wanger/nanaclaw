import fs from 'fs';
import os from 'os';
import path from 'path';

import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureSchema, insertMessage, nextEvenSeq, openInboundDb, countDueMessages } from './db/session-db.js';

interface SessionFixture {
  tmpDir: string;
  inboundPath: string;
  outboundPath: string;
}

function createSessionFixture(): SessionFixture {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-test-'));
  const inboundPath = path.join(tmpDir, 'inbound.db');
  const outboundPath = path.join(tmpDir, 'outbound.db');
  return { tmpDir, inboundPath, outboundPath };
}

function cleanupFixture(fixture: SessionFixture): void {
  fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
}

describe('session DB: journal_mode invariant', () => {
  let fixture: SessionFixture;

  beforeEach(() => {
    fixture = createSessionFixture();
  });
  afterEach(() => cleanupFixture(fixture));

  it('inbound.db uses journal_mode=delete', () => {
    ensureSchema(fixture.inboundPath, 'inbound');
    const db = new Database(fixture.inboundPath);
    const result = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    expect(result[0].journal_mode).toBe('delete');
    db.close();
  });

  it('outbound.db uses journal_mode=delete', () => {
    ensureSchema(fixture.outboundPath, 'outbound');
    const db = new Database(fixture.outboundPath);
    const result = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    expect(result[0].journal_mode).toBe('delete');
    db.close();
  });
});

describe('session DB: inbound round-trip', () => {
  let fixture: SessionFixture;

  beforeEach(() => {
    fixture = createSessionFixture();
    ensureSchema(fixture.inboundPath, 'inbound');
  });
  afterEach(() => cleanupFixture(fixture));

  it('insertMessage writes a row readable by raw SQL', () => {
    const db = openInboundDb(fixture.inboundPath);
    insertMessage(db, {
      id: 'msg-1',
      kind: 'text',
      timestamp: '2026-04-27T00:00:00Z',
      platformId: 'tg:123',
      channelType: 'telegram',
      threadId: null,
      content: 'Hello from host',
      processAfter: null,
      recurrence: null,
    });
    db.close();

    const readDb = new Database(fixture.inboundPath, { readonly: true });
    const row = readDb.prepare('SELECT * FROM messages_in WHERE id = ?').get('msg-1') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.content).toBe('Hello from host');
    expect(row.kind).toBe('text');
    expect(row.platform_id).toBe('tg:123');
    expect(row.status).toBe('pending');
    readDb.close();
  });

  it('countDueMessages finds pending messages', () => {
    const db = openInboundDb(fixture.inboundPath);
    insertMessage(db, {
      id: 'msg-2',
      kind: 'text',
      timestamp: '2026-04-27T00:00:00Z',
      platformId: null,
      channelType: null,
      threadId: null,
      content: 'Test',
      processAfter: null,
      recurrence: null,
    });
    expect(countDueMessages(db)).toBe(1);
    db.close();
  });

  it('host writes use even seq numbers', () => {
    const db = openInboundDb(fixture.inboundPath);

    const seq1 = nextEvenSeq(db);
    expect(seq1 % 2).toBe(0);

    insertMessage(db, {
      id: 'msg-a',
      kind: 'text',
      timestamp: '2026-04-27T00:00:00Z',
      platformId: null,
      channelType: null,
      threadId: null,
      content: 'First',
      processAfter: null,
      recurrence: null,
    });

    const seq2 = nextEvenSeq(db);
    expect(seq2 % 2).toBe(0);
    expect(seq2).toBeGreaterThan(seq1);

    db.close();
  });
});

describe('session DB: outbound round-trip', () => {
  let fixture: SessionFixture;

  beforeEach(() => {
    fixture = createSessionFixture();
    ensureSchema(fixture.outboundPath, 'outbound');
  });
  afterEach(() => cleanupFixture(fixture));

  it('container write is readable by host (raw SQL)', () => {
    const writeDb = new Database(fixture.outboundPath);
    writeDb.pragma('journal_mode = DELETE');
    writeDb
      .prepare(
        `INSERT INTO messages_out (id, seq, timestamp, kind, content)
       VALUES (?, ?, ?, ?, ?)`,
      )
      .run('out-1', 1, '2026-04-27T00:00:00Z', 'text', 'Reply from agent');
    writeDb.close();

    const readDb = new Database(fixture.outboundPath, { readonly: true });
    const row = readDb.prepare('SELECT * FROM messages_out WHERE id = ?').get('out-1') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.content).toBe('Reply from agent');
    expect(row.kind).toBe('text');
    expect(row.seq).toBe(1);
    readDb.close();
  });

  it('container uses odd seq numbers (by convention)', () => {
    const writeDb = new Database(fixture.outboundPath);
    writeDb.pragma('journal_mode = DELETE');
    writeDb
      .prepare(
        `INSERT INTO messages_out (id, seq, timestamp, kind, content)
       VALUES (?, ?, ?, ?, ?)`,
      )
      .run('out-a', 1, '2026-04-27T00:00:00Z', 'text', 'First');
    writeDb
      .prepare(
        `INSERT INTO messages_out (id, seq, timestamp, kind, content)
       VALUES (?, ?, ?, ?, ?)`,
      )
      .run('out-b', 3, '2026-04-27T00:01:00Z', 'text', 'Second');
    writeDb.close();

    const readDb = new Database(fixture.outboundPath, { readonly: true });
    const rows = readDb.prepare('SELECT seq FROM messages_out ORDER BY seq').all() as Array<{ seq: number }>;
    for (const row of rows) {
      expect(row.seq % 2).toBe(1);
    }
    readDb.close();
  });

  it('processing_ack tracks message completion', () => {
    const writeDb = new Database(fixture.outboundPath);
    writeDb.pragma('journal_mode = DELETE');
    writeDb
      .prepare(
        `INSERT INTO processing_ack (message_id, status, status_changed)
       VALUES (?, ?, ?)`,
      )
      .run('msg-1', 'completed', '2026-04-27T00:01:00Z');
    writeDb.close();

    const readDb = new Database(fixture.outboundPath, { readonly: true });
    const row = readDb.prepare('SELECT * FROM processing_ack WHERE message_id = ?').get('msg-1') as Record<
      string,
      unknown
    >;
    expect(row).toBeDefined();
    expect(row.status).toBe('completed');
    readDb.close();
  });
});

describe('session DB: cross-DB round-trip', () => {
  let fixture: SessionFixture;

  beforeEach(() => {
    fixture = createSessionFixture();
    ensureSchema(fixture.inboundPath, 'inbound');
    ensureSchema(fixture.outboundPath, 'outbound');
  });
  afterEach(() => cleanupFixture(fixture));

  it('host writes inbound, agent writes outbound, both readable', () => {
    const inDb = openInboundDb(fixture.inboundPath);
    insertMessage(inDb, {
      id: 'msg-in-1',
      kind: 'text',
      timestamp: '2026-04-27T00:00:00Z',
      platformId: 'tg:123',
      channelType: 'telegram',
      threadId: null,
      content: 'User question',
      processAfter: null,
      recurrence: null,
    });
    inDb.close();

    const outDb = new Database(fixture.outboundPath);
    outDb.pragma('journal_mode = DELETE');
    outDb
      .prepare(
        `INSERT INTO messages_out (id, seq, in_reply_to, timestamp, kind, content)
       VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run('msg-out-1', 1, 'msg-in-1', '2026-04-27T00:00:01Z', 'text', 'Agent response');
    outDb.close();

    const readIn = new Database(fixture.inboundPath, { readonly: true });
    const inRow = readIn.prepare('SELECT content FROM messages_in WHERE id = ?').get('msg-in-1') as { content: string };
    expect(inRow.content).toBe('User question');
    readIn.close();

    const readOut = new Database(fixture.outboundPath, { readonly: true });
    const outRow = readOut.prepare('SELECT content, in_reply_to FROM messages_out WHERE id = ?').get('msg-out-1') as {
      content: string;
      in_reply_to: string;
    };
    expect(outRow.content).toBe('Agent response');
    expect(outRow.in_reply_to).toBe('msg-in-1');
    readOut.close();
  });
});
