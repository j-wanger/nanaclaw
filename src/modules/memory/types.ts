export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';

export interface MemoryEntry {
  type: MemoryType;
  title: string;
  content: string;
  created: string; // ISO date YYYY-MM-DD
}
