import fs from 'fs';
import path from 'path';

export interface AuthorityConfig {
  domains: Record<string, number>;
  default: number;
}

const FALLBACK_CONFIG: AuthorityConfig = {
  domains: {
    'gov': 8, 'edu': 7,
    'fatf-gafi.org': 9, 'fincen.gov': 9, 'fintrac.gc.ca': 9,
    'treasury.gov': 9, 'sec.gov': 9, 'ofac.treasury.gov': 9,
    'imf.org': 8, 'worldbank.org': 8, 'bis.org': 8,
    'reuters.com': 7, 'ft.com': 7, 'bloomberg.com': 7, 'wsj.com': 7,
    'arxiv.org': 7, 'nber.org': 7,
    'investopedia.com': 5, 'wikipedia.org': 5,
    'medium.com': 3, 'substack.com': 3, 'reddit.com': 2,
  },
  default: 4,
};

export function loadAuthorityConfig(wikiPath: string): AuthorityConfig {
  const configPath = path.join(wikiPath, 'source-authority.json');
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as AuthorityConfig;
    if (raw.domains && typeof raw.default === 'number') return raw;
  } catch {}
  return FALLBACK_CONFIG;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return '';
  }
}

function lookupAuthority(hostname: string, config: AuthorityConfig): number {
  if (config.domains[hostname] !== undefined) return config.domains[hostname];

  const parts = hostname.split('.');
  for (let i = 1; i < parts.length; i++) {
    const suffix = parts.slice(i).join('.');
    if (config.domains[suffix] !== undefined) return config.domains[suffix];
  }

  const tld = parts[parts.length - 1];
  if (config.domains[tld] !== undefined) return config.domains[tld];

  return config.default;
}

function computeDepth(contentLength: number): number {
  if (contentLength <= 0) return 0;
  return Math.min(Math.log2(contentLength / 100), 10);
}

export function computeSourceScore(url: string, contentLength: number, config?: AuthorityConfig): number {
  const cfg = config || FALLBACK_CONFIG;
  const hostname = extractDomain(url);
  const authority = lookupAuthority(hostname, cfg);
  const depth = computeDepth(contentLength);
  const score = authority * 0.6 + depth * 0.4;
  return Math.round(score * 10) / 10;
}
