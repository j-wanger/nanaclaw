import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { extractEntities, appendEntities, type EntityEntry } from './entity-store.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entity-store-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('extractEntities', () => {
  it('extracts PERSON entity with all fields', () => {
    const text = '## Entities\n[ENTITY type=PERSON] Sam Bankman-Fried|male|30|CEO|defendant|United States';
    const entities = extractEntities(text);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('PERSON');
    expect(entities[0].name).toBe('Sam Bankman-Fried');
    expect(entities[0].fields).toEqual({
      gender: 'male',
      age: '30',
      profession: 'CEO',
      role: 'defendant',
      jurisdiction: 'United States',
    });
  });

  it('extracts ORGANIZATION entity', () => {
    const text = '[ENTITY type=ORGANIZATION] FTX Trading Ltd|cryptocurrency exchange|Bahamas|collapsed exchange';
    const entities = extractEntities(text);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('ORGANIZATION');
    expect(entities[0].name).toBe('FTX Trading Ltd');
    expect(entities[0].fields).toEqual({
      org_type: 'cryptocurrency exchange',
      jurisdiction: 'Bahamas',
      role: 'collapsed exchange',
    });
  });

  it('extracts LOCATION entity', () => {
    const text = '[ENTITY type=LOCATION] Toronto|city|headquarters of TD Bank';
    const entities = extractEntities(text);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('LOCATION');
    expect(entities[0].name).toBe('Toronto');
    expect(entities[0].fields).toEqual({
      location_type: 'city',
      context: 'headquarters of TD Bank',
    });
  });

  it('extracts AMOUNT entity', () => {
    const text = '[ENTITY type=AMOUNT] 1.8 billion|USD|penalty imposed by FinCEN';
    const entities = extractEntities(text);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('AMOUNT');
    expect(entities[0].name).toBe('1.8 billion');
    expect(entities[0].fields).toEqual({
      currency: 'USD',
      context: 'penalty imposed by FinCEN',
    });
  });

  it('extracts CASE entity', () => {
    const text = '[ENTITY type=CASE] United States v. Bankman-Fried|DOJ|2023-12-01|convicted on all counts';
    const entities = extractEntities(text);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('CASE');
    expect(entities[0].name).toBe('United States v. Bankman-Fried');
    expect(entities[0].fields).toEqual({
      agency: 'DOJ',
      date: '2023-12-01',
      outcome: 'convicted on all counts',
    });
  });

  it('extracts DATE entity', () => {
    const text = '[ENTITY type=DATE] 2023-11-02|FTX bankruptcy filing date';
    const entities = extractEntities(text);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('DATE');
    expect(entities[0].name).toBe('2023-11-02');
    expect(entities[0].fields).toEqual({ context: 'FTX bankruptcy filing date' });
  });

  it('extracts multiple entities from text', () => {
    const text = [
      '## Entities',
      '[ENTITY type=PERSON] John Doe|male|45|banker|suspect|Canada',
      'Some intervening text',
      '[ENTITY type=ORGANIZATION] HSBC|bank|UK|fined institution',
      '[ENTITY type=AMOUNT] 1.9 billion|USD|deferred prosecution agreement',
    ].join('\n');
    const entities = extractEntities(text);
    expect(entities).toHaveLength(3);
    expect(entities.map((e) => e.type)).toEqual(['PERSON', 'ORGANIZATION', 'AMOUNT']);
  });

  it('returns empty array for no entities', () => {
    expect(extractEntities('No entities here')).toEqual([]);
    expect(extractEntities('')).toEqual([]);
  });

  it('handles entity with missing optional fields gracefully', () => {
    const text = '[ENTITY type=PERSON] Jane Smith';
    const entities = extractEntities(text);
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe('Jane Smith');
    expect(entities[0].type).toBe('PERSON');
  });

  it('handles list-style entity lines with leading dash', () => {
    const text = '- [ENTITY type=PERSON] Bob Jones|male|50|accountant|witness|US';
    const entities = extractEntities(text);
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe('Bob Jones');
  });
});

describe('appendEntities', () => {
  it('appends entities to entities.jsonl', () => {
    const entities: EntityEntry[] = [
      { type: 'PERSON', name: 'John Doe', fields: { gender: 'male' }, source_url: 'https://example.com/article', wiki: 'aml-wiki', created: '2026-05-01' },
    ];
    appendEntities(tmpDir, entities);

    const lines = fs.readFileSync(path.join(tmpDir, 'entities.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.type).toBe('PERSON');
    expect(parsed.name).toBe('John Doe');
    expect(parsed.source_url).toBe('https://example.com/article');
  });

  it('deduplicates by type + lowercase name + source_url', () => {
    const entity: EntityEntry = {
      type: 'PERSON', name: 'John Doe', fields: { gender: 'male' },
      source_url: 'https://example.com/a', wiki: 'aml-wiki', created: '2026-05-01',
    };
    appendEntities(tmpDir, [entity]);
    appendEntities(tmpDir, [{ ...entity, name: 'john doe' }]);

    const lines = fs.readFileSync(path.join(tmpDir, 'entities.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
  });

  it('does not dedup entities from different sources', () => {
    const base: EntityEntry = {
      type: 'PERSON', name: 'John Doe', fields: {},
      source_url: 'https://example.com/a', wiki: 'aml-wiki', created: '2026-05-01',
    };
    appendEntities(tmpDir, [base]);
    appendEntities(tmpDir, [{ ...base, source_url: 'https://example.com/b' }]);

    const lines = fs.readFileSync(path.join(tmpDir, 'entities.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('does nothing for empty array', () => {
    appendEntities(tmpDir, []);
    expect(fs.existsSync(path.join(tmpDir, 'entities.jsonl'))).toBe(false);
  });
});
