import { Database } from 'bun:sqlite';
import path from 'path';
import { cosineSimilarity } from './vector-utils.js';

const SEARCH_CHUNK_SIZE = 10_000;

export interface KnowledgeInsert {
  text: string;
  contextual_text: string;
  type: 'claim' | 'sentence';
  source_url: string | null;
  article_slug: string;
  section: string;
  source_score: number;
  wiki: string;
  embedding: Float32Array;
}

export interface KnowledgeRow {
  id: number;
  text: string;
  contextual_text: string;
  type: string;
  source_url: string | null;
  article_slug: string;
  section: string;
  source_score: number;
  wiki: string;
  created: string;
}

export interface SearchResult extends KnowledgeRow {
  similarity: number;
}

export class KnowledgeVectorStore {
  private db: Database;

  constructor(wikiPath: string) {
    this.db = new Database(path.join(wikiPath, 'knowledge.db'));
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run(`
      CREATE TABLE IF NOT EXISTS knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        contextual_text TEXT NOT NULL,
        type TEXT NOT NULL,
        source_url TEXT,
        article_slug TEXT NOT NULL,
        section TEXT NOT NULL DEFAULT '',
        source_score REAL NOT NULL DEFAULT 0,
        wiki TEXT NOT NULL,
        created TEXT NOT NULL,
        embedding BLOB NOT NULL
      )
    `);
    this.db.run('CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge(type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_knowledge_article ON knowledge(article_slug)');
  }

  insertEntry(entry: KnowledgeInsert): number {
    const stmt = this.db.prepare(
      `INSERT INTO knowledge (text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created, embedding)
       VALUES ($text, $contextual_text, $type, $source_url, $article_slug, $section, $source_score, $wiki, $created, $embedding)`,
    );
    const result = stmt.run({
      $text: entry.text,
      $contextual_text: entry.contextual_text,
      $type: entry.type,
      $source_url: entry.source_url,
      $article_slug: entry.article_slug,
      $section: entry.section,
      $source_score: entry.source_score,
      $wiki: entry.wiki,
      $created: new Date().toISOString().slice(0, 10),
      $embedding: Buffer.from(entry.embedding.buffer),
    });
    return Number(result.lastInsertRowid);
  }

  getById(id: number): KnowledgeRow | null {
    return this.db.prepare(
      'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created FROM knowledge WHERE id = $id',
    ).get({ $id: id }) as KnowledgeRow | null;
  }

  getAllByType(type?: string): KnowledgeRow[] {
    if (type) {
      return this.db.prepare(
        'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created FROM knowledge WHERE type = $type',
      ).all({ $type: type }) as KnowledgeRow[];
    }
    return this.db.prepare(
      'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created FROM knowledge',
    ).all() as KnowledgeRow[];
  }

  getByArticleSlug(slug: string, type?: string): Array<KnowledgeRow & { embedding: Float32Array }> {
    const sql = type
      ? 'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created, embedding FROM knowledge WHERE article_slug = $slug AND type = $type'
      : 'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created, embedding FROM knowledge WHERE article_slug = $slug';
    const params: Record<string, string> = { $slug: slug };
    if (type) params.$type = type;
    const rows = this.db.prepare(sql).all(params) as Array<KnowledgeRow & { embedding: Buffer }>;
    return rows.map((r) => ({
      ...r,
      embedding: new Float32Array(new Uint8Array(r.embedding).buffer),
    }));
  }

  searchSimilar(query: Float32Array, topK: number, type?: string): SearchResult[] {
    const countSql = type
      ? 'SELECT count(*) as cnt FROM knowledge WHERE type = $type'
      : 'SELECT count(*) as cnt FROM knowledge';
    const total = (this.db.prepare(countSql).get(type ? { $type: type } : {}) as { cnt: number }).cnt;

    const selectSql = type
      ? 'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created, embedding FROM knowledge WHERE type = $type LIMIT $limit OFFSET $offset'
      : 'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created, embedding FROM knowledge LIMIT $limit OFFSET $offset';

    const topResults: SearchResult[] = [];

    for (let offset = 0; offset < total; offset += SEARCH_CHUNK_SIZE) {
      const params: Record<string, string | number> = { $limit: SEARCH_CHUNK_SIZE, $offset: offset };
      if (type) params.$type = type;

      const rows = this.db.prepare(selectSql).all(params) as Array<KnowledgeRow & { embedding: Buffer }>;

      for (const row of rows) {
        const stored = new Float32Array(new Uint8Array(row.embedding).buffer);
        const similarity = cosineSimilarity(query, stored);

        if (topResults.length < topK || similarity > topResults[topResults.length - 1].similarity) {
          const { embedding: _, ...rest } = row;
          topResults.push({ ...rest, similarity });
          topResults.sort((a, b) => b.similarity - a.similarity);
          if (topResults.length > topK) topResults.length = topK;
        }
      }
    }

    return topResults;
  }

  db_allWithEmbeddings(type?: string): Array<KnowledgeRow & { embedding: Float32Array }> {
    const sql = type
      ? 'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created, embedding FROM knowledge WHERE type = $type'
      : 'SELECT id, text, contextual_text, type, source_url, article_slug, section, source_score, wiki, created, embedding FROM knowledge';
    const rows = this.db.prepare(sql).all(type ? { $type: type } : {}) as Array<KnowledgeRow & { embedding: Buffer }>;
    return rows.map((r) => ({
      ...r,
      embedding: new Float32Array(new Uint8Array(r.embedding).buffer),
    }));
  }

  close(): void {
    this.db.close();
  }
}
