import fs from 'fs';
import { parseFrontmatter, stripFrontmatter } from './wiki-utils.js';

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateRawArticle(filePath: string): ValidationResult {
  const issues: string[] = [];

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { valid: false, issues: ['file not readable'] };
  }

  const fm = parseFrontmatter(content);
  if (!fm) {
    return { valid: false, issues: ['no frontmatter'] };
  }

  if (!fm.source_url) issues.push('missing source_url');
  if (!fm.sha256) issues.push('missing sha256');
  if (!fm.title || (typeof fm.title === 'string' && fm.title.trim() === '')) issues.push('empty title');

  const body = stripFrontmatter(content);
  if (body.length < 100) issues.push(`content too short (${body.length} chars)`);

  return { valid: issues.length === 0, issues };
}

export function validateEpisodicArticle(filePath: string): ValidationResult {
  const issues: string[] = [];

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { valid: false, issues: ['file not readable'] };
  }

  const fm = parseFrontmatter(content);
  if (!fm) {
    return { valid: false, issues: ['no frontmatter'] };
  }

  if (!fm.source_url) issues.push('missing source_url');
  if (!fm.title || (typeof fm.title === 'string' && fm.title.trim() === '')) issues.push('empty title');

  const tags = fm.tags;
  if (!tags || (Array.isArray(tags) && tags.length === 0)) issues.push('empty tags');

  const body = stripFrontmatter(content);
  if (!body.includes('## Summary')) issues.push('missing ## Summary section');
  if (!body.includes('## Key Points')) issues.push('missing ## Key Points section');

  return { valid: issues.length === 0, issues };
}
