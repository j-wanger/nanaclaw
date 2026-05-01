export interface SentenceEntry {
  text: string;
  section: string;
  position: number;
}

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n*/;
const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const HEADING_RE = /^#{1,6}\s+(.+)$/;
const LIST_PREFIX_RE = /^[-*+]\s+|^\d+\.\s+/;
const ABBREV_RE = /\b(?:U\.S|Dr|Mr|Mrs|Ms|Jr|Sr|Inc|Ltd|Corp|vs|etc|approx|est|Gov|Sen|Rep|Gen|Sgt|Dept|Assn|Ave|Blvd|St)\./g;
const ABBREV_PLACEHOLDER = '\x00ABR\x00';

function restoreAbbreviations(text: string): string {
  return text.replaceAll(ABBREV_PLACEHOLDER, '.');
}

export function splitSentences(markdown: string): SentenceEntry[] {
  if (!markdown.trim()) return [];

  let body = markdown.replace(FRONTMATTER_RE, '');
  body = body.replace(CODE_BLOCK_RE, '');

  const entries: SentenceEntry[] = [];
  let currentSection = '';
  let position = 0;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (TABLE_ROW_RE.test(trimmed)) continue;

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      currentSection = headingMatch[1].trim();
      continue;
    }

    let content = trimmed.replace(LIST_PREFIX_RE, '');
    if (!content) continue;

    // Protect abbreviations from sentence splitting
    const protected_ = content.replace(ABBREV_RE, (m) => m.slice(0, -1) + ABBREV_PLACEHOLDER);

    const rawSentences = protected_.split(/(?<=[.!?])\s+/);

    for (const raw of rawSentences) {
      const sentence = restoreAbbreviations(raw).trim();
      if (sentence.length < 10) continue;

      entries.push({ text: sentence, section: currentSection, position });
      position++;
    }
  }

  return entries;
}
