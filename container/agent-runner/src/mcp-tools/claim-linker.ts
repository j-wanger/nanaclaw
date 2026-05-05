export interface NliPair {
  claimText: string;
  sentenceText: string;
  sentenceId: number;
}

export type NliLabel = 'entails' | 'neutral' | 'contradicts';

export interface NliResult {
  pair: number;
  label: NliLabel;
  score: number;
  explanation: string;
}

const NLI_SCORE_MAP: Record<NliLabel, number> = {
  entails: 1.0,
  neutral: 0.5,
  contradicts: 0.0,
};

const VALID_NLI_LABELS = new Set<string>(['entails', 'neutral', 'contradicts']);
const NLI_RE = /\[NLI pair=(\d+)\]\s*(ENTAILS|NEUTRAL|CONTRADICTS)\s*\|\s*(.+)/gi;

export function buildNliPrompt(pairs: NliPair[]): string {
  const pairTexts = pairs.map((p, i) =>
    `PAIR ${i + 1}:\nCLAIM: ${p.claimText}\nEVIDENCE: ${p.sentenceText}`,
  ).join('\n\n');

  return `You are classifying whether evidence sentences support claims from wiki articles.

For each pair, determine the relationship:
- IF the evidence directly supports or restates the claim → ENTAILS
- IF the evidence is related but neither supports nor contradicts → NEUTRAL
- IF the evidence states the opposite of the claim → CONTRADICTS

Output exactly one line per pair in this format:
[NLI pair=N] ENTAILS|NEUTRAL|CONTRADICTS | brief explanation

${pairTexts}`;
}

export function parseNliResults(output: string): NliResult[] {
  const results: NliResult[] = [];
  let match: RegExpExecArray | null;
  while ((match = NLI_RE.exec(output)) !== null) {
    const label = match[2].toLowerCase() as string;
    if (!VALID_NLI_LABELS.has(label)) continue;
    const nliLabel = label as NliLabel;
    results.push({
      pair: parseInt(match[1], 10),
      label: nliLabel,
      score: NLI_SCORE_MAP[nliLabel],
      explanation: match[3].trim(),
    });
  }
  NLI_RE.lastIndex = 0;
  return results;
}

export interface ParsedClaim {
  id: string;
  text: string;
  section: string;
}

const CLAIM_MARKER_RE = /\[\[clm_([a-z0-9]+)\]\]/g;
const SECTION_HEADING_RE = /^#{2,}\s+(.+)$/;

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  return match ? content.slice(match[0].length) : content;
}

function extractPrecedingSentence(line: string, markerStart: number): string {
  const before = line.slice(0, markerStart);
  const trimmed = before.trimEnd();
  const lastPeriod = trimmed.lastIndexOf('. ');
  const start = lastPeriod >= 0 ? lastPeriod + 2 : 0;
  let sentence = trimmed.slice(start);
  if (!sentence.endsWith('.')) {
    const dotIdx = sentence.lastIndexOf('.');
    if (dotIdx >= 0) sentence = sentence.slice(0, dotIdx + 1);
  }
  return sentence.trim();
}

export function parseClaimMarkers(content: string): ParsedClaim[] {
  const body = stripFrontmatter(content);
  const lines = body.split('\n');
  const claims: ParsedClaim[] = [];
  let currentSection = '';

  for (const line of lines) {
    const headingMatch = line.match(SECTION_HEADING_RE);
    if (headingMatch) {
      currentSection = headingMatch[1].trim();
      continue;
    }

    CLAIM_MARKER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CLAIM_MARKER_RE.exec(line)) !== null) {
      const id = `clm_${match[1]}`;
      const text = extractPrecedingSentence(line, match.index);
      if (text) {
        claims.push({ id, text, section: currentSection });
      }
    }
  }

  return claims;
}

export interface ClaimMeta {
  id: string;
  sentence_ids: number[];
  source_docs: string[];
  nli_score: number | null;
  verified_at: string | null;
}

function parseYamlInlineArray(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed === '[]' || trimmed === '') return [];
  const inner = trimmed.replace(/^\[/, '').replace(/\]$/, '');
  return inner.split(',').map((s) => s.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '')).filter(Boolean);
}

function parseYamlNumberArray(value: string): number[] {
  return parseYamlInlineArray(value).map(Number).filter((n) => !isNaN(n));
}

function parseYamlNullable(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === 'null' || trimmed === '') return null;
  return trimmed;
}

export function parseClaimMetadata(content: string): ClaimMeta[] {
  const fmMatch = content.match(/^---\n([\s\S]*?\n)---/);
  if (!fmMatch) return [];

  const fm = fmMatch[1];
  const fmLines = fm.split('\n');
  const blocks = parseClaimBlocks(fm);
  if (blocks.length === 0) return [];

  return blocks.map((block) => {
    const blockLines = fmLines.slice(block.startLine, block.endLine);
    let sentenceIds: number[] = [];
    let sourceDocs: string[] = [];
    let nliScore: number | null = null;
    let verifiedAt: string | null = null;

    for (const line of blockLines) {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('sentence_ids:')) {
        sentenceIds = parseYamlNumberArray(trimmed.slice('sentence_ids:'.length));
      } else if (trimmed.startsWith('source_docs:')) {
        sourceDocs = parseYamlInlineArray(trimmed.slice('source_docs:'.length));
      } else if (trimmed.startsWith('nli_score:')) {
        const raw = parseYamlNullable(trimmed.slice('nli_score:'.length));
        nliScore = raw !== null ? parseFloat(raw) : null;
        if (nliScore !== null && isNaN(nliScore)) nliScore = null;
      } else if (trimmed.startsWith('verified_at:')) {
        verifiedAt = parseYamlNullable(trimmed.slice('verified_at:'.length));
      }
    }

    return { id: block.id, sentence_ids: sentenceIds, source_docs: sourceDocs, nli_score: nliScore, verified_at: verifiedAt };
  });
}

export interface ClaimUpdate {
  id: string;
  sentence_ids: number[];
  source_docs: string[];
  nli_score: number | null;
  verified_at: string;
}

function formatYamlArray(arr: (number | string)[], quote: boolean): string {
  if (arr.length === 0) return '[]';
  const items = quote ? arr.map((v) => `'${v}'`) : arr;
  return `[${items.join(', ')}]`;
}

function rebuildClaimBlock(lines: string[], update: ClaimUpdate | undefined): string {
  if (!update) return lines.join('\n');

  return lines.map((line) => {
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);
    if (trimmed.startsWith('sentence_ids:')) return `${indent}sentence_ids: ${formatYamlArray(update.sentence_ids, false)}`;
    if (trimmed.startsWith('source_docs:')) return `${indent}source_docs: ${formatYamlArray(update.source_docs, true)}`;
    if (trimmed.startsWith('nli_score:')) return `${indent}nli_score: ${update.nli_score ?? 'null'}`;
    if (trimmed.startsWith('verified_at:')) return `${indent}verified_at: ${update.verified_at}`;
    return line;
  }).join('\n');
}

export function parseClaimBlocks(frontmatter: string): { id: string; startLine: number; endLine: number }[] {
  const lines = frontmatter.split('\n');
  const blocks: { id: string; startLine: number; endLine: number }[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith('- id: clm_')) {
      const id = trimmed.replace('- id: ', '').trim();
      const start = i;
      i++;
      while (i < lines.length) {
        const next = lines[i].trimStart();
        if (next.startsWith('- id:') || !next.startsWith('  ') && next !== '' && !lines[i].startsWith('    ')) break;
        i++;
      }
      blocks.push({ id, startLine: start, endLine: i });
    } else {
      i++;
    }
  }
  return blocks;
}

export function updateClaimsFrontmatter(content: string, updates: ClaimUpdate[]): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?\n)(---)/);
  if (!fmMatch) return content;

  const before = fmMatch[1];
  const fm = fmMatch[2];
  const after = fmMatch[3];
  const body = content.slice(fmMatch[0].length);

  const updateMap = new Map(updates.map((u) => [u.id, u]));
  const fmLines = fm.split('\n');
  const blocks = parseClaimBlocks(fm);

  if (blocks.length === 0) return content;

  let hasUpdates = false;
  for (const block of blocks) {
    if (updateMap.has(block.id)) {
      hasUpdates = true;
      break;
    }
  }
  if (!hasUpdates) return content;

  const resultLines: string[] = [];
  let lastEnd = 0;

  for (const block of blocks) {
    resultLines.push(...fmLines.slice(lastEnd, block.startLine));
    const blockLines = fmLines.slice(block.startLine, block.endLine);
    const update = updateMap.get(block.id);
    resultLines.push(rebuildClaimBlock(blockLines, update));
    lastEnd = block.endLine;
  }
  resultLines.push(...fmLines.slice(lastEnd));

  return before + resultLines.join('\n') + after + body;
}

// --- Pipeline ---

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { embedText } from './claim-embeddings.js';
import { KnowledgeVectorStore, type SearchResult } from './knowledge-vector-store.js';
import { executeAgentLoop, type AgentLoopResult } from './local-worker/agent-loop.js';

const DEFAULT_THRESHOLD = 0.7;
const DEFAULT_TOP_K = 10;

type EmbedFn = (text: string) => Promise<Float32Array | null>;
type NliFn = (prompt: string) => Promise<AgentLoopResult>;

export interface MatchOptions {
  threshold?: number;
  topK?: number;
}

export async function matchClaimToSentences(
  claimText: string,
  articleSlug: string,
  store: KnowledgeVectorStore,
  embedFn: EmbedFn,
  options: MatchOptions = {},
): Promise<SearchResult[]> {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const topK = options.topK ?? DEFAULT_TOP_K;

  const queryVec = await embedFn(claimText);
  if (!queryVec) return [];

  const overFetch = topK * 2;
  const raw = store.searchSimilar(queryVec, overFetch, 'sentence');

  return raw
    .filter((r) => r.article_slug !== articleSlug && r.similarity >= threshold)
    .slice(0, topK);
}

export interface LinkOptions {
  store: KnowledgeVectorStore;
  embedFn: EmbedFn;
  nliFn: NliFn;
  skipNli?: boolean;
  threshold?: number;
  topK?: number;
}

export interface LinkResult {
  claims_processed: number;
  claims_linked: number;
  claims_verified: number;
  updatedContent: string;
  details: Array<{ id: string; sentence_ids: number[]; nli_score: number | null }>;
}

export async function linkArticleClaims(
  content: string,
  articleSlug: string,
  options: LinkOptions,
): Promise<LinkResult> {
  const parsed = parseClaimMarkers(content);
  if (parsed.length === 0) {
    return { claims_processed: 0, claims_linked: 0, claims_verified: 0, updatedContent: content, details: [] };
  }

  const matchOpts: MatchOptions = { threshold: options.threshold, topK: options.topK };
  const claimMatches = new Map<string, SearchResult[]>();

  for (const claim of parsed) {
    const candidates = await matchClaimToSentences(claim.text, articleSlug, options.store, options.embedFn, matchOpts);
    if (candidates.length > 0) {
      claimMatches.set(claim.id, candidates);
    }
  }

  const nliScores = new Map<string, number>();
  const entailingSentenceIds = new Map<string, Set<number>>();
  let verified = 0;

  if (!options.skipNli && claimMatches.size > 0) {
    const allPairs: NliPair[] = [];
    const pairClaimMap: Array<{ claimId: string; pairIndex: number; sentenceId: number }> = [];

    for (const [claimId, candidates] of claimMatches) {
      const claim = parsed.find((c) => c.id === claimId)!;
      for (const cand of candidates) {
        pairClaimMap.push({ claimId, pairIndex: allPairs.length + 1, sentenceId: cand.id });
        allPairs.push({ claimText: claim.text, sentenceText: cand.text, sentenceId: cand.id });
      }
    }

    if (allPairs.length > 0) {
      const prompt = buildNliPrompt(allPairs);
      const result = await options.nliFn(prompt);

      if (result.terminationReason === 'complete') {
        const nliResults = parseNliResults(result.output);
        const nliByPair = new Map(nliResults.map((r) => [r.pair, r]));

        const claimScores = new Map<string, number[]>();
        for (const mapping of pairClaimMap) {
          const nli = nliByPair.get(mapping.pairIndex);
          if (nli) {
            const scores = claimScores.get(mapping.claimId) || [];
            scores.push(nli.score);
            claimScores.set(mapping.claimId, scores);
            if (nli.label === 'entails') {
              const ids = entailingSentenceIds.get(mapping.claimId) || new Set();
              ids.add(mapping.sentenceId);
              entailingSentenceIds.set(mapping.claimId, ids);
            }
          }
        }

        for (const [claimId, scores] of claimScores) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          nliScores.set(claimId, Math.round(avg * 100) / 100);
        }
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const updates: ClaimUpdate[] = [];
  const details: LinkResult['details'] = [];
  let linked = 0;

  for (const claim of parsed) {
    const candidates = claimMatches.get(claim.id);
    if (!candidates || candidates.length === 0) {
      details.push({ id: claim.id, sentence_ids: [], nli_score: null });
      continue;
    }

    const nliScore = nliScores.get(claim.id) ?? null;
    const entailing = entailingSentenceIds.get(claim.id);

    // If NLI ran, filter to only entailing sentences; otherwise use all cosine-passing candidates
    const finalIds = entailing && entailing.size > 0
      ? candidates.filter((c) => entailing.has(c.id)).map((c) => c.id)
      : candidates.map((c) => c.id);

    if (finalIds.length === 0) {
      details.push({ id: claim.id, sentence_ids: [], nli_score: nliScore });
      continue;
    }

    const finalCandidates = candidates.filter((c) => finalIds.includes(c.id));
    const sourceDocs = [...new Set(finalCandidates.map((c) => c.source_url).filter(Boolean))] as string[];

    linked++;
    if (nliScore !== null) verified++;

    updates.push({
      id: claim.id,
      sentence_ids: finalIds,
      source_docs: sourceDocs,
      nli_score: nliScore,
      verified_at: nliScore !== null ? today : 'null',
    });

    details.push({ id: claim.id, sentence_ids: finalIds, nli_score: nliScore });
  }

  const updatedContent = updates.length > 0 ? updateClaimsFrontmatter(content, updates) : content;

  return {
    claims_processed: parsed.length,
    claims_linked: linked,
    claims_verified: verified,
    updatedContent,
    details,
  };
}

// --- MCP Tool Registration ---

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

export async function handleClaimLink(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const articleSlug = (args.article_slug as string || '').trim();
  const skipNli = args.skip_nli === true;
  const threshold = typeof args.threshold === 'number' ? args.threshold : undefined;
  const topK = typeof args.top_k === 'number' ? args.top_k : undefined;

  if (!wiki) return text('Error: wiki is required');
  if (!articleSlug) return text('Error: article_slug is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const articleDir = path.join(wikiPath, 'articles');
  const articleFile = findArticleFile(articleDir, articleSlug);
  if (!articleFile) return text(`Error: article not found: ${articleSlug}`);

  const content = fs.readFileSync(articleFile, 'utf8');
  const store = new KnowledgeVectorStore(wikiPath);

  try {
    const result = await linkArticleClaims(content, articleSlug, {
      store,
      embedFn: embedText as EmbedFn,
      nliFn: defaultNliFn,
      skipNli,
      threshold,
      topK,
    });

    if (result.updatedContent !== content) {
      fs.writeFileSync(articleFile, result.updatedContent);
    }

    return text(JSON.stringify({
      claims_processed: result.claims_processed,
      claims_linked: result.claims_linked,
      claims_verified: result.claims_verified,
      details: result.details,
    }));
  } finally {
    store.close();
  }
}

function findArticleFile(articlesDir: string, slug: string): string | null {
  if (!fs.existsSync(articlesDir)) return null;
  const dirs = fs.readdirSync(articlesDir);
  for (const dir of dirs) {
    const dirPath = path.join(articlesDir, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;
    const filePath = path.join(dirPath, `${slug}.md`);
    if (fs.existsSync(filePath)) return filePath;
  }
  const directPath = path.join(articlesDir, `${slug}.md`);
  if (fs.existsSync(directPath)) return directPath;
  return null;
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'claim_link',
      description: 'Link wiki article claims to supporting sentences in knowledge.db. Extracts [[clm_*]] markers, searches for supporting evidence via vector similarity, runs NLI verification via Qwen, and updates the article frontmatter with sentence_ids, source_docs, nli_score, and verified_at.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to search for evidence' },
          article_slug: { type: 'string', description: 'Article slug (filename without .md extension)' },
          skip_nli: { type: 'boolean', description: 'Skip NLI verification (link by similarity only)' },
          threshold: { type: 'number', description: 'Minimum cosine similarity threshold (default: 0.7)' },
          top_k: { type: 'number', description: 'Max candidate sentences per claim (default: 10)' },
        },
        required: ['wiki', 'article_slug'],
      },
    },
    handler: handleClaimLink,
  },
];

registerTools(tools);
