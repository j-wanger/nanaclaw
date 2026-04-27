import fs from 'fs';
import path from 'path';

const MODELS_FILE = 'models.json';

export interface ModelConfig {
  name: string;
  url: string;
  max_concurrent: number;
  task_types: string[];
}

export interface LocalWorkerConfig {
  routes: Record<string, string>;
  endpoints: Record<string, { max_concurrent: number }>;
}

export function loadModels(groupDir: string): ModelConfig[] {
  const filePath = path.join(groupDir, MODELS_FILE);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ModelConfig[];
  } catch {
    return [];
  }
}

export function buildLocalWorkerConfig(models: ModelConfig[]): LocalWorkerConfig {
  const routes: Record<string, string> = {};
  const endpoints: Record<string, { max_concurrent: number }> = {};

  for (const model of models) {
    for (const taskType of model.task_types) {
      routes[taskType] = model.url;
    }
    endpoints[model.url] = { max_concurrent: model.max_concurrent };
  }

  return { routes, endpoints };
}
