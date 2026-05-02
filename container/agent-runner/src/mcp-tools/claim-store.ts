import fs from 'fs';
import path from 'path';

export interface ClaimEntry {
  claim: string;
  source_url: string | null;
  source_score: number;
  wiki: string;
  created: string;
}

export interface InsightEntry {
  insight: string;
  source_url: string | null;
  source_score: number;
  wiki: string;
  created: string;
}

const CLAIM_RE = /^\s*(?:-\s*)?\[CLAIM\]\s*(.+)$/gm;
const INSIGHT_RE = /^\s*(?:-\s*)?\[INSIGHT\]\s*(.+)$/gm;

export function extractClaims(text: string): string[] {
  const claims: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = CLAIM_RE.exec(text)) !== null) {
    const claim = match[1].trim();
    if (claim.length > 0) claims.push(claim);
  }
  CLAIM_RE.lastIndex = 0;
  return claims;
}

export function extractInsights(text: string): string[] {
  const insights: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = INSIGHT_RE.exec(text)) !== null) {
    const insight = match[1].trim();
    if (insight.length > 0) insights.push(insight);
  }
  INSIGHT_RE.lastIndex = 0;
  return insights;
}

export function appendClaims(wikiPath: string, claims: string[], metadata: { source_url: string | null; source_score: number; wiki: string }): void {
  if (claims.length === 0) return;

  const claimsPath = path.join(wikiPath, 'claims.jsonl');
  const today = new Date().toISOString().slice(0, 10);

  const lines = claims.map((claim) =>
    JSON.stringify({
      claim,
      source_url: metadata.source_url,
      source_score: metadata.source_score,
      wiki: metadata.wiki,
      created: today,
    } satisfies ClaimEntry),
  );

  fs.appendFileSync(claimsPath, lines.join('\n') + '\n');
}

export function appendInsights(wikiPath: string, insights: string[], metadata: { source_url: string | null; source_score: number; wiki: string }): void {
  if (insights.length === 0) return;

  const insightsPath = path.join(wikiPath, 'insights.jsonl');
  const today = new Date().toISOString().slice(0, 10);

  const lines = insights.map((insight) =>
    JSON.stringify({
      insight,
      source_url: metadata.source_url,
      source_score: metadata.source_score,
      wiki: metadata.wiki,
      created: today,
    } satisfies InsightEntry),
  );

  fs.appendFileSync(insightsPath, lines.join('\n') + '\n');
}
