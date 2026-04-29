import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { registerTools } from './server.js';
import { tryJinaExtract } from './jina.js';
import type { McpToolDefinition } from './types.js';

const JINA_FALLBACK_THRESHOLD = 500;

function log(msg: string): void {
  console.error(`[web-extract] ${msg}`);
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function htmlToMarkdown(html: string, url: string): string {
  const { document } = parseHTML(html);

  const reader = new Readability(document as unknown as Document, { charThreshold: 100 });
  const article = reader.parse();

  if (!article || !article.textContent?.trim()) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const title = article.title ? `# ${article.title}\n\nSource: ${url}\n\n` : '';
  return title + article.textContent.trim();
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[Truncated]';
}

export async function extractHandler(args: Record<string, unknown>) {
  const url = (args.url as string || '').trim();
  if (!url) {
    return ok('Error: url is required');
  }

  const maxChars = (args.max_chars as number) || 50_000;

  try {
    const resp = await fetch(url);

    if (!resp.ok) {
      return ok(`Error: Fetch returned ${resp.status} ${resp.statusText}`);
    }

    const contentType = resp.headers.get('content-type') || '';
    const body = await resp.text();

    if (!contentType.includes('html')) {
      return ok(truncate(body, maxChars));
    }

    let markdown = htmlToMarkdown(body, url);

    if (markdown.length < JINA_FALLBACK_THRESHOLD) {
      const jinaContent = await tryJinaExtract(url, maxChars, markdown.length);
      if (jinaContent) markdown = jinaContent;
    }

    return ok(truncate(markdown, maxChars));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Extract failed: ${msg}`);
    return ok(`Error: Extract failed — ${msg}`);
  }
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'web_extract',
      description:
        'Extract page content from a URL as clean markdown. Strips navigation, ads, and boilerplate. Use after web_search to get full article content.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          url: { type: 'string', description: 'URL to extract content from' },
          max_chars: {
            type: 'number',
            description: 'Maximum characters to return (default 50000)',
          },
        },
        required: ['url'],
      },
    },
    handler: extractHandler,
  },
];

registerTools(tools);
