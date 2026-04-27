import Database from 'better-sqlite3';
import type { MemoryEntry, MemoryType } from './types.js';

export interface SearchResult {
  entry: MemoryEntry;
  score: number;
}

export function rebuildIndex(dbPath: string, entries: MemoryEntry[]): void {
  const db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
    db.exec('DROP TABLE IF EXISTS memory_fts');
    db.exec(`
      CREATE VIRTUAL TABLE memory_fts USING fts5(
        title,
        content,
        type UNINDEXED,
        created UNINDEXED
      )
    `);
    const insert = db.prepare('INSERT INTO memory_fts (title, content, type, created) VALUES (?, ?, ?, ?)');
    const tx = db.transaction((items: MemoryEntry[]) => {
      for (const e of items) {
        insert.run(e.title, e.content, e.type, e.created);
      }
    });
    tx(entries);
  } finally {
    db.close();
  }
}

export function search(dbPath: string, query: string, maxResults = 50): SearchResult[] {
  const db = new Database(dbPath, { readonly: true });
  try {
    const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='memory_fts'").get();
    if (!tableExists) return [];

    const escaped = query.replace(/"/g, '""');
    const rows = db
      .prepare(
        `SELECT title, content, type, created, rank
         FROM memory_fts
         WHERE memory_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(`"${escaped}"`, maxResults) as Array<{
      title: string;
      content: string;
      type: string;
      created: string;
      rank: number;
    }>;

    return rows.map((r) => ({
      entry: {
        title: r.title,
        content: r.content,
        type: r.type as MemoryType,
        created: r.created,
      },
      score: -r.rank,
    }));
  } finally {
    db.close();
  }
}
