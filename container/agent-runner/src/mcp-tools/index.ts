/**
 * MCP tools barrel — imports each tool module for its side-effect
 * `registerTools([...])` call, then starts the MCP server.
 *
 * Adding a new tool module: create the file, call `registerTools([...])`
 * at module scope, and append the import here. No central list.
 */
import './core.js';
import './scheduling.js';
import './interactive.js';
import './agents.js';
import './self-mod.js';
import './deep-work.js';
import './local-worker/index.js';
import './voice-tts.js';
import './web-search.js';
import './web-extract.js';
import './wiki-write.js';
import './wiki-search.js';
import './research-fetch.js';
import './research-summarize.js';
import './research-review.js';
import './wiki-read.js';
import './wiki-stats.js';
import './project-init.js';
import './wiki-backfill.js';
import './claim-tools.js';
import './knowledge-tools.js';
import './knowledge-analysis-tools.js';
import { startMcpServer } from './server.js';

function log(msg: string): void {
  console.error(`[mcp-tools] ${msg}`);
}

startMcpServer().catch((err) => {
  log(`MCP server error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
