import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { backfillHandler } from './wiki-backfill.js';

function getText(result: { content: Array<{ text: string }> }): string {
  return result.content[0].text;
}

describe('wiki_backfill_source_urls', () => {
  let tmpDir: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-test-'));
    origEnv = process.env.WIKIS_JSON_PATH;

    const wikiPath = path.join(tmpDir, 'test-wiki');
    fs.mkdirSync(path.join(wikiPath, 'episodic'), { recursive: true });
    fs.mkdirSync(path.join(wikiPath, 'raw', 'articles'), { recursive: true });

    // Episodic without source_url
    fs.writeFileSync(path.join(wikiPath, 'episodic', 'tornado-cash-sanctions.md'),
      '---\ntitle: "Tornado Cash Sanctions"\ntags: ["crypto"]\nsource: worker-research\ntier: episodic\n---\n\n## Summary\n\nContent.\n\n## Key Points\n\n- Point\n');

    // Episodic already having source_url
    fs.writeFileSync(path.join(wikiPath, 'episodic', 'already-fixed.md'),
      '---\ntitle: "Already Fixed"\ntags: ["test"]\nsource_url: https://existing.com\ntier: episodic\n---\n\nContent.\n');

    // Episodic with no raw match
    fs.writeFileSync(path.join(wikiPath, 'episodic', 'no-match-article.md'),
      '---\ntitle: "No Match"\ntags: ["test"]\ntier: episodic\n---\n\nContent.\n');

    // Raw article matching first episodic by slug
    fs.writeFileSync(path.join(wikiPath, 'raw', 'articles', 'tornado-cash-sanctions.md'),
      '---\ntitle: "Tornado Cash Sanctions"\nsource_url: https://example.com/tornado\nsha256: abc\ntier: raw\n---\n\nRaw content.\n');

    const wikisJson = { version: 1, wikis: [{ name: 'test-wiki', path: wikiPath, description: 'Test' }] };
    fs.writeFileSync(path.join(tmpDir, 'wikis.json'), JSON.stringify(wikisJson));
    process.env.WIKIS_JSON_PATH = path.join(tmpDir, 'wikis.json');
  });

  afterEach(() => {
    if (origEnv === undefined) delete process.env.WIKIS_JSON_PATH;
    else process.env.WIKIS_JSON_PATH = origEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('matches episodic to raw by slug and writes source_url', async () => {
    const result = await backfillHandler({ wiki_name: 'test-wiki' });
    const data = JSON.parse(getText(result));
    expect(data.fixed).toBe(1);

    const wikiPath = path.join(tmpDir, 'test-wiki');
    const updated = fs.readFileSync(path.join(wikiPath, 'episodic', 'tornado-cash-sanctions.md'), 'utf8');
    expect(updated).toContain('source_url: https://example.com/tornado');
  });

  test('skips entries already having source_url', async () => {
    const result = await backfillHandler({ wiki_name: 'test-wiki' });
    const data = JSON.parse(getText(result));
    expect(data.skipped).toBe(1);
  });

  test('counts unmatched entries', async () => {
    const result = await backfillHandler({ wiki_name: 'test-wiki' });
    const data = JSON.parse(getText(result));
    expect(data.unmatched).toBe(1);
  });

  test('returns correct total', async () => {
    const result = await backfillHandler({ wiki_name: 'test-wiki' });
    const data = JSON.parse(getText(result));
    expect(data.total).toBe(3);
  });

  test('handles missing raw dir gracefully', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    fs.rmSync(path.join(wikiPath, 'raw'), { recursive: true, force: true });
    const result = await backfillHandler({ wiki_name: 'test-wiki' });
    const data = JSON.parse(getText(result));
    expect(data.unmatched).toBe(2);
    expect(data.fixed).toBe(0);
  });

  test('requires wiki_name', async () => {
    const result = await backfillHandler({});
    expect(getText(result)).toContain('Error');
  });

  test('errors for unknown wiki', async () => {
    const result = await backfillHandler({ wiki_name: 'nope' });
    expect(getText(result)).toContain('Error');
  });
});
