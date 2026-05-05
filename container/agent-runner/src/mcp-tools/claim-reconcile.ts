import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { detectStaleClaims } from './claim-conflicts.js';
import type { StalenessCheckDeps, StalenessResult } from './claim-conflicts.js';
import { parseClaimMetadata, updateClaimsFrontmatter, linkArticleClaims } from './claim-linker.js';
import type { ClaimUpdate, LinkOptions } from './claim-linker.js';
import { embedText } from './claim-embeddings.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { executeAgentLoop, type AgentLoopResult } from './local-worker/agent-loop.js';

export interface ReconcileOptions {
  staleDeps: StalenessCheckDeps;
  linkOptions: LinkOptions;
  onBeforeRelink?: (clearedContent: string) => void;
}

export interface ReconcileResult {
  staleClaims: StalenessResult[];
  orphanedClaims: StalenessResult[];
  reconciled: boolean;
  relinkedCount: number;
  updatedContent: string;
}

export async function reconcileArticle(
  content: string,
  articleSlug: string,
  options: ReconcileOptions,
): Promise<ReconcileResult> {
  const claims = parseClaimMetadata(content);
  if (claims.length === 0) {
    return { staleClaims: [], orphanedClaims: [], reconciled: false, relinkedCount: 0, updatedContent: content };
  }

  const allIssues = detectStaleClaims(claims, options.staleDeps);
  const staleClaims = allIssues.filter((r) => r.reason === 'evidence_updated');
  const orphanedClaims = allIssues.filter((r) => r.reason === 'orphaned_ids');

  if (allIssues.length === 0) {
    return { staleClaims: [], orphanedClaims: [], reconciled: false, relinkedCount: 0, updatedContent: content };
  }

  const affectedIds = new Set(allIssues.map((r) => r.claimId));
  const clearUpdates: ClaimUpdate[] = claims
    .filter((c) => affectedIds.has(c.id))
    .map((c) => ({
      id: c.id,
      sentence_ids: [],
      source_docs: [],
      nli_score: null,
      verified_at: 'null',
    }));

  const clearedContent = updateClaimsFrontmatter(content, clearUpdates);

  if (options.onBeforeRelink) {
    options.onBeforeRelink(clearedContent);
  }

  const linkResult = await linkArticleClaims(clearedContent, articleSlug, options.linkOptions);

  return {
    staleClaims,
    orphanedClaims,
    reconciled: true,
    relinkedCount: linkResult.claims_linked,
    updatedContent: linkResult.updatedContent,
  };
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
  const entry = wikis?.find((w) => w.name === wikiName);
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
      const rawPath = path.join(wikiPath, 'raw', 'articles', doc);
      try {
        return fs.statSync(rawPath).mtime;
      } catch { return null; }
    },
  };
}

async function defaultNliFn(prompt: string): Promise<AgentLoopResult> {
  return executeAgentLoop({
    messages: [
      { role: 'system', content: 'You are a precise text classifier. Follow the output format exactly.' },
      { role: 'user', content: prompt },
    ],
    tools: [],
    maxIterations: 1,
    timeoutMs: 30_000,
    taskType: 'structured-output',
  });
}

export async function handleClaimReconcile(args: Record<string, unknown>, wikiPathOverride?: string): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const articleSlug = (args.article_slug as string || '').trim() || undefined;
  const dryRun = args.dry_run === true;

  if (!wiki && !wikiPathOverride) return text('Error: wiki is required');

  const wikiPath = wikiPathOverride || resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const articlesDir = path.join(wikiPath, 'articles');
  const articleFiles = findArticleFiles(articlesDir, articleSlug);

  let store: KnowledgeVectorStore | null = null;
  const dbPath = path.join(wikiPath, 'knowledge.db');
  if (fs.existsSync(dbPath)) {
    store = new KnowledgeVectorStore(wikiPath);
  }

  const staleDeps = store
    ? buildStaleDeps(store, wikiPath)
    : { sentenceExists: () => true, getSourceFileMtime: () => null };

  const linkOptions: LinkOptions = {
    store: store || { searchSimilar: () => [], close: () => {}, getById: () => null } as any,
    embedFn: embedText as (text: string) => Promise<Float32Array | null>,
    nliFn: defaultNliFn,
    skipNli: dryRun,
  };

  let articlesScanned = 0;
  let articlesReconciled = 0;
  let totalStale = 0;
  let totalOrphaned = 0;
  const details: Array<{ slug: string; stale: number; orphaned: number; relinked: number }> = [];

  for (const af of articleFiles) {
    try {
      const content = fs.readFileSync(af.filePath, 'utf8');
      const claims = parseClaimMetadata(content);
      if (claims.length === 0) continue;

      articlesScanned++;

      const result = await reconcileArticle(content, af.slug, { staleDeps, linkOptions });

      if (result.reconciled) {
        articlesReconciled++;
        totalStale += result.staleClaims.length;
        totalOrphaned += result.orphanedClaims.length;

        if (!dryRun) {
          fs.writeFileSync(af.filePath, result.updatedContent);
        }

        details.push({
          slug: af.slug,
          stale: result.staleClaims.length,
          orphaned: result.orphanedClaims.length,
          relinked: result.relinkedCount,
        });
      }
    } catch (e) {
      console.error(`[claim-reconcile] ${af.slug} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (store) store.close();

  return text(JSON.stringify({
    articles_scanned: articlesScanned,
    articles_reconciled: articlesReconciled,
    total_stale: totalStale,
    total_orphaned: totalOrphaned,
    dry_run: dryRun,
    details,
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'claim_reconcile',
      description: 'Reconcile stale and orphaned wiki claims. Detects claims where source evidence was updated after verification (stale) or linked sentence_ids no longer exist in knowledge.db (orphaned), then re-runs the linking pipeline to refresh them. Use dry_run=true to preview without writing.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to reconcile claims in' },
          article_slug: { type: 'string', description: 'Optional: scope to a single article. Omit to scan all articles with claims.' },
          dry_run: { type: 'boolean', description: 'Preview changes without writing to disk (default: false). Skips NLI for speed.' },
        },
        required: ['wiki'],
      },
    },
    handler: (args: Record<string, unknown>) => handleClaimReconcile(args),
  },
];

registerTools(tools);
