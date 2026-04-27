/**
 * Memory module — operational memory via MEMORY.md + FTS5.
 *
 * Registers a spawn-time hook that generates a frozen context fragment
 * from the agent group's MEMORY.md. Called by container-runner.buildMounts
 * after CLAUDE.md composition.
 */
export { generateMemoryFragment } from './context-builder.js';
export { generateWikiContext } from './wiki-bridge.js';
