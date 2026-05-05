import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { parseClaimMetadata, parseClaimMarkers } from './claim-linker.js';
import type { ClaimMeta, ParsedClaim } from './claim-linker.js';
import type { ConflictPair } from './knowledge-conflicts.js';
import { classifyConflictPairs, type ClassifiedConflictPair } from './knowledge-classify.js';
import { cosineSimilarity } from './vector-utils.js';
import { embedText } from './claim-embeddings.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';

export interface ArticleClaims {
  articleSlug: string;
  claims: ClaimMeta[];
}

export interface SharedEvidencePair {
  claimA: ClaimMeta;
  claimB: ClaimMeta;
  articleSlugA: string;
  articleSlugB: string;
  sharedIds: number[];
  overlapCount: number;
}

export function findSharedEvidence(articleClaims: ArticleClaims[]): SharedEvidencePair[] {
  const pairs: SharedEvidencePair[] = [];

  for (let i = 0; i < articleClaims.length; i++) {
    for (let j = i + 1; j < articleClaims.length; j++) {
      const artA = articleClaims[i];
      const artB = articleClaims[j];

      for (const claimA of artA.claims) {
        if (claimA.sentence_ids.length === 0) continue;
        const setA = new Set(claimA.sentence_ids);

        for (const claimB of artB.claims) {
          if (claimB.sentence_ids.length === 0) continue;

          const shared = claimB.sentence_ids.filter((id) => setA.has(id));
          if (shared.length > 0) {
            pairs.push({
              claimA,
              claimB,
              articleSlugA: artA.articleSlug,
              articleSlugB: artB.articleSlug,
              sharedIds: shared,
              overlapCount: shared.length,
            });
          }
        }
      }
    }
  }

  pairs.sort((a, b) => b.overlapCount - a.overlapCount);
  return pairs;
}

// --- Staleness + orphan detection ---

export interface StalenessCheckDeps {
  sentenceExists: (id: number) => boolean;
  getSourceFileMtime: (doc: string) => Date | null;
}

export type StalenessReason = 'evidence_updated' | 'orphaned_ids';

export interface StalenessResult {
  claimId: string;
  reason: StalenessReason;
  details: string;
  orphanedIds?: number[];
}

export function detectStaleClaims(claims: ClaimMeta[], deps: StalenessCheckDeps): StalenessResult[] {
  const results: StalenessResult[] = [];

  for (const claim of claims) {
    if (!claim.verified_at) continue;

    const verifiedDate = new Date(claim.verified_at);

    // Check source_docs file mtimes
    for (const doc of claim.source_docs) {
      const mtime = deps.getSourceFileMtime(doc);
      if (mtime && mtime > verifiedDate) {
        results.push({
          claimId: claim.id,
          reason: 'evidence_updated',
          details: `${doc} modified after verified_at (${claim.verified_at})`,
        });
        break;
      }
    }

    // Check orphaned sentence_ids
    if (claim.sentence_ids.length > 0) {
      const orphaned = claim.sentence_ids.filter((id) => !deps.sentenceExists(id));
      if (orphaned.length > 0) {
        results.push({
          claimId: claim.id,
          reason: 'orphaned_ids',
          details: `${orphaned.length} sentence_ids not found in knowledge.db`,
          orphanedIds: orphaned,
        });
      }
    }
  }

  return results;
}

// --- Cross-claim NLI conflict detection ---

export interface ClaimNliDeps {
  embedFn: (text: string) => Promise<Float32Array | null>;
  classifyFn: (pairs: ConflictPair[]) => Promise<ClassifiedConflictPair[]>;
  getClaimTexts: (articleSlug: string) => ParsedClaim[];
}

export interface ClaimNliOptions {
  threshold?: number;
  topK?: number;
}

interface EmbeddedClaim {
  id: string;
  text: string;
  section: string;
  articleSlug: string;
  embedding: Float32Array;
}

export async function findClaimNliConflicts(
  articleClaims: ArticleClaims[],
  deps: ClaimNliDeps,
  options: ClaimNliOptions = {},
): Promise<ClassifiedConflictPair[]> {
  const threshold = options.threshold ?? 0.7;
  const topK = options.topK ?? 20;

  const embedded: EmbeddedClaim[] = [];

  for (const art of articleClaims) {
    const texts = deps.getClaimTexts(art.articleSlug);
    for (const claim of texts) {
      const vec = await deps.embedFn(claim.text);
      if (vec) {
        embedded.push({ id: claim.id, text: claim.text, section: claim.section, articleSlug: art.articleSlug, embedding: vec });
      }
    }
  }

  if (embedded.length < 2) return [];

  const candidatePairs: ConflictPair[] = [];

  for (let i = 0; i < embedded.length; i++) {
    for (let j = i + 1; j < embedded.length; j++) {
      if (embedded[i].articleSlug === embedded[j].articleSlug) continue;

      const sim = cosineSimilarity(embedded[i].embedding, embedded[j].embedding);
      if (sim < threshold) continue;

      candidatePairs.push({
        a: { text: embedded[i].text, contextual_text: '', article_slug: embedded[i].articleSlug, section: embedded[i].section, source_url: null },
        b: { text: embedded[j].text, contextual_text: '', article_slug: embedded[j].articleSlug, section: embedded[j].section, source_url: null },
        similarity: Math.round(sim * 1000) / 1000,
      });
    }
  }

  if (candidatePairs.length === 0) return [];

  candidatePairs.sort((a, b) => b.similarity - a.similarity);
  const trimmed = candidatePairs.slice(0, topK);

  return deps.classifyFn(trimmed);
}

// --- MCP Tool ---

interface WikiEntry { name: string; path: string; description: string; }

function loadWikis(): WikiEntry[] | null {
  const wikisPath = process.env.WIKIS_JSON_PATH || path.join(os.homedir(), '.claude', 'wikis.json');
  try {
    return (JSON.parse(fs.readFileSync(wikisPath, 'utf8')) as { wikis: WikiEntry[] }).wikis || [];
  } catch { return null; }
}

function resolveWikiPath(wikiName: string): string | null {
  const wikis = loadWikis();
  const entry = wikis?.find((w) => w.name === wikiName) || wikis?.[0];
  return entry?.path || null;
}

function text(msg: string): CallToolResult {
  return { content: [{ type: 'text', text: msg }] };
}

function findArticleFiles(articlesDir: string, slugFilter?: string): Array<{ slug: string; filePath: string }> {
  if (!fs.existsSync(articlesDir)) return [];
  const result: Array<{ slug: string; filePath: string }> = [];

  const dirs = fs.readdirSync(articlesDir);
  for (const dir of dirs) {
    const dirPath = path.join(articlesDir, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const slug = file.replace(/\.md$/, '');
      if (slugFilter && slug !== slugFilter) continue;
      result.push({ slug, filePath: path.join(dirPath, file) });
    }
  }
  return result;
}

function buildStaleDeps(store: KnowledgeVectorStore, wikiPath: string): StalenessCheckDeps {
  return {
    sentenceExists: (id: number) => store.getById(id) !== null,
    getSourceFileMtime: (doc: string) => {
      const rawPath = path.join(wikiPath, 'raw', doc);
      try {
        return fs.statSync(rawPath).mtime;
      } catch { return null; }
    },
  };
}

export async function handleClaimConflicts(args: Record<string, unknown>, wikiPathOverride?: string): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const articleSlug = (args.article_slug as string || '').trim() || undefined;
  const skipNli = args.skip_nli === true;
  const topK = typeof args.top_k === 'number' ? args.top_k : 20;
  const threshold = typeof args.threshold === 'number' ? args.threshold : 0.7;

  if (!wiki && !wikiPathOverride) return text('Error: wiki is required');

  const wikiPath = wikiPathOverride || resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const articlesDir = path.join(wikiPath, 'articles');
  const articleFiles = findArticleFiles(articlesDir, articleSlug);

  const allArticleClaims: ArticleClaims[] = [];
  for (const af of articleFiles) {
    const content = fs.readFileSync(af.filePath, 'utf8');
    const claims = parseClaimMetadata(content);
    if (claims.length > 0) {
      allArticleClaims.push({ articleSlug: af.slug, claims });
    }
  }

  const sharedEvidence = findSharedEvidence(allArticleClaims);

  let staleness: StalenessResult[] = [];
  let store: KnowledgeVectorStore | null = null;
  try {
    const dbPath = path.join(wikiPath, 'knowledge.db');
    if (fs.existsSync(dbPath)) {
      store = new KnowledgeVectorStore(wikiPath);
      const staleDeps = buildStaleDeps(store, wikiPath);
      for (const ac of allArticleClaims) {
        staleness.push(...detectStaleClaims(ac.claims, staleDeps));
      }
    }
  } catch (e) { console.error(`[claim-conflicts] staleness check failed: ${e instanceof Error ? e.message : e}`); }

  let nliConflicts: ClassifiedConflictPair[] = [];
  if (!skipNli && allArticleClaims.length >= 2) {
    try {
      const nliDeps: ClaimNliDeps = {
        embedFn: embedText as (text: string) => Promise<Float32Array | null>,
        classifyFn: classifyConflictPairs,
        getClaimTexts: (slug: string) => {
          const af = articleFiles.find((f) => f.slug === slug);
          if (!af) return [];
          const content = fs.readFileSync(af.filePath, 'utf8');
          return parseClaimMarkers(content);
        },
      };
      nliConflicts = await findClaimNliConflicts(allArticleClaims, nliDeps, { threshold, topK });
    } catch (e) { console.error(`[claim-conflicts] NLI check failed: ${e instanceof Error ? e.message : e}`); }
  }

  if (store) store.close();

  return text(JSON.stringify({
    shared_evidence: sharedEvidence.map((p) => ({
      claim_a: { id: p.claimA.id, article_slug: p.articleSlugA },
      claim_b: { id: p.claimB.id, article_slug: p.articleSlugB },
      shared_sentence_ids: p.sharedIds,
      overlap_count: p.overlapCount,
      conflict_type: 'shared_evidence',
    })),
    staleness: staleness.map((s) => ({
      claim_id: s.claimId,
      conflict_type: s.reason,
      details: s.details,
      orphaned_ids: s.orphanedIds ?? null,
    })),
    nli_conflicts: nliConflicts.map((p) => ({
      claim_a: { text: p.a.text, article_slug: p.a.article_slug, section: p.a.section },
      claim_b: { text: p.b.text, article_slug: p.b.article_slug, section: p.b.section },
      similarity: p.similarity,
      classification: p.classification ?? null,
      explanation: p.explanation ?? null,
      conflict_type: p.classification === 'contradict' ? 'nli_contradict' : p.classification === 'agree' ? 'nli_agree' : null,
    })),
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'claim_conflicts',
      description: 'Detect conflicts between wiki article claims using three vectors: shared evidence (overlapping sentence_ids), staleness (source updated after verification), and cross-claim NLI (semantic contradiction via Qwen). Returns a unified report with conflict types.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to scan for conflicts' },
          article_slug: { type: 'string', description: 'Optional: scope to a single article. Omit to scan all articles with claims.' },
          top_k: { type: 'number', description: 'Maximum NLI conflict pairs to return (default: 20)' },
          threshold: { type: 'number', description: 'Minimum cosine similarity for NLI pairs (default: 0.7)' },
          skip_nli: { type: 'boolean', description: 'Skip cross-claim NLI detection (default: false). Use for faster structural-only scan.' },
        },
        required: ['wiki'],
      },
    },
    handler: (args: Record<string, unknown>) => handleClaimConflicts(args),
  },
];

registerTools(tools);
