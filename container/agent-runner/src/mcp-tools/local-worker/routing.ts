import fs from 'fs';

import { LLAMA_CPP_URL } from '../../config.js';

export interface RoutingConfig {
  routes: Record<string, string>;
  endpoints: Record<string, { max_concurrent: number }>;
}

export function loadRoutingConfig(configPath: string): RoutingConfig | null {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!raw.localWorker || !raw.localWorker.routes) return null;
    return raw.localWorker as RoutingConfig;
  } catch {
    return null;
  }
}

export function routeTask(taskType: string, config: RoutingConfig | null): string {
  if (!config) return LLAMA_CPP_URL;
  return config.routes[taskType] || LLAMA_CPP_URL;
}
