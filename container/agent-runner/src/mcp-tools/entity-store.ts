import fs from 'fs';
import path from 'path';

export interface EntityEntry {
  type: string;
  name: string;
  fields: Record<string, string>;
  source_url: string | null;
  wiki: string;
  created: string;
}

const FIELD_SCHEMAS: Record<string, string[]> = {
  PERSON: ['gender', 'age', 'profession', 'role', 'jurisdiction'],
  ORGANIZATION: ['org_type', 'jurisdiction', 'role'],
  LOCATION: ['location_type', 'context'],
  AMOUNT: ['currency', 'context'],
  CASE: ['agency', 'date', 'outcome'],
  DATE: ['context'],
};

const ENTITY_RE = /^\s*(?:-\s*)?\[ENTITY\s+type=(\w+)\]\s*(.+)$/gm;

export function extractEntities(text: string): EntityEntry[] {
  const entities: EntityEntry[] = [];
  let match: RegExpExecArray | null;
  while ((match = ENTITY_RE.exec(text)) !== null) {
    const type = match[1].toUpperCase();
    const raw = match[2].trim();
    const parts = raw.split('|').map((p) => p.trim());
    const name = parts[0];
    if (!name) continue;

    const schema = FIELD_SCHEMAS[type] || [];
    const fields: Record<string, string> = {};
    for (let i = 0; i < schema.length && i + 1 < parts.length; i++) {
      if (parts[i + 1]) fields[schema[i]] = parts[i + 1];
    }

    entities.push({ type, name, fields, source_url: null, wiki: '', created: '' });
  }
  ENTITY_RE.lastIndex = 0;
  return entities;
}

function dedupKey(e: EntityEntry): string {
  return `${e.type}\t${e.name.toLowerCase()}\t${e.source_url || ''}`;
}

export function appendEntities(wikiPath: string, entities: EntityEntry[]): void {
  if (entities.length === 0) return;

  const filePath = path.join(wikiPath, 'entities.jsonl');

  const existing = new Set<string>();
  if (fs.existsSync(filePath)) {
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as EntityEntry;
        existing.add(dedupKey(entry));
      } catch { /* skip malformed */ }
    }
  }

  const newLines: string[] = [];
  for (const entity of entities) {
    const key = dedupKey(entity);
    if (existing.has(key)) continue;
    existing.add(key);
    newLines.push(JSON.stringify(entity));
  }

  if (newLines.length > 0) {
    fs.appendFileSync(filePath, newLines.join('\n') + '\n');
  }
}
