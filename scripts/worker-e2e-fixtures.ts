export interface E2EFixture {
  objective: string;
  type: 'code-impl' | 'file-op' | 'research' | 'structured-output';
  outputFormat: 'json' | 'code' | 'markdown';
  context: string;
  boundaries: string[];
  postconditions: Array<{ type: string; params: Record<string, string> }>;
  timeout_ms: number;
  context_budget_tokens: number;
  expected_verdict: 'pass' | 'fail';
}

export const fixtures: E2EFixture[] = [
  // --- code-impl (3) ---
  {
    objective: 'Implement a TypeScript function `isPalindrome(s: string): boolean` that checks if a string is a palindrome, ignoring case and non-alphanumeric characters.',
    type: 'code-impl',
    outputFormat: 'code',
    context: '',
    boundaries: ['No external dependencies', 'Single function only'],
    postconditions: [
      { type: 'contains', params: { substring: 'isPalindrome' } },
      { type: 'contains', params: { substring: 'boolean' } },
    ],
    timeout_ms: 30000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },
  {
    objective: 'Implement a TypeScript function `groupBy<T>(arr: T[], key: keyof T): Record<string, T[]>` that groups array elements by a key.',
    type: 'code-impl',
    outputFormat: 'code',
    context: '',
    boundaries: ['No external dependencies', 'Use generics'],
    postconditions: [
      { type: 'contains', params: { substring: 'groupBy' } },
      { type: 'regex', params: { pattern: 'Record<' } },
    ],
    timeout_ms: 30000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },
  {
    objective: 'Implement a TypeScript function `debounce(fn: Function, ms: number): Function` that delays invoking fn until ms milliseconds after the last call.',
    type: 'code-impl',
    outputFormat: 'code',
    context: '',
    boundaries: ['No external dependencies', 'Must use setTimeout'],
    postconditions: [
      { type: 'contains', params: { substring: 'debounce' } },
      { type: 'contains', params: { substring: 'setTimeout' } },
    ],
    timeout_ms: 30000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },

  // --- structured-output (3) ---
  {
    objective: 'Extract the following fields from this package.json fragment into a JSON object with keys: name, version, license, hasTests (boolean: true if "test" script exists).',
    type: 'structured-output',
    outputFormat: 'json',
    context: JSON.stringify({
      name: 'my-app',
      version: '2.1.0',
      license: 'MIT',
      scripts: { build: 'tsc', test: 'vitest', lint: 'eslint' },
      dependencies: { express: '^4.18.0' },
    }),
    boundaries: ['Output only the 4 requested fields'],
    postconditions: [
      { type: 'contains', params: { substring: '"name"' } },
      { type: 'contains', params: { substring: '"hasTests"' } },
      { type: 'contains', params: { substring: 'true' } },
    ],
    timeout_ms: 20000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },
  {
    objective: 'Convert this CSV data into a JSON array of objects. Each row becomes an object with column headers as keys.',
    type: 'structured-output',
    outputFormat: 'json',
    context: 'name,age,city\nAlice,30,NYC\nBob,25,LA\nCharlie,35,Chicago',
    boundaries: ['Output valid JSON array only'],
    postconditions: [
      { type: 'contains', params: { substring: 'Alice' } },
      { type: 'contains', params: { substring: 'Chicago' } },
      { type: 'regex', params: { pattern: '\\[' } },
    ],
    timeout_ms: 20000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },
  {
    objective: 'Given this TypeScript interface, produce a JSON schema (draft-07) that validates objects conforming to it.',
    type: 'structured-output',
    outputFormat: 'json',
    context: 'interface User { id: string; name: string; email: string; age?: number; roles: string[]; }',
    boundaries: ['Output valid JSON Schema draft-07 only'],
    postconditions: [
      { type: 'contains', params: { substring: '"properties"' } },
      { type: 'contains', params: { substring: '"required"' } },
    ],
    timeout_ms: 20000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },

  // --- research (2) ---
  {
    objective: 'Compare SQLite WAL mode vs DELETE journal mode for cross-process visibility. Summarize when each is appropriate in 3-5 bullet points.',
    type: 'research',
    outputFormat: 'markdown',
    context: '',
    boundaries: ['Focus on cross-process/cross-mount scenarios', 'Keep under 200 words'],
    postconditions: [
      { type: 'contains', params: { substring: 'WAL' } },
      { type: 'contains', params: { substring: 'DELETE' } },
      { type: 'line-count', params: { min: '3', max: '30' } },
    ],
    timeout_ms: 30000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },
  {
    objective: 'Explain the difference between a semaphore and a mutex. When would you use each in an async JavaScript/TypeScript context?',
    type: 'research',
    outputFormat: 'markdown',
    context: '',
    boundaries: ['Keep under 150 words', 'Include a practical example for each'],
    postconditions: [
      { type: 'contains', params: { substring: 'semaphore' } },
      { type: 'contains', params: { substring: 'mutex' } },
      { type: 'line-count', params: { min: '3', max: '25' } },
    ],
    timeout_ms: 30000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },

  // --- file-op (2) ---
  {
    objective: 'Generate a .gitignore file for a Node.js + TypeScript project with common patterns: node_modules, dist, .env, coverage, *.log.',
    type: 'file-op',
    outputFormat: 'code',
    context: '',
    boundaries: ['Output only the file content', 'Include comments for each section'],
    postconditions: [
      { type: 'contains', params: { substring: 'node_modules' } },
      { type: 'contains', params: { substring: '.env' } },
      { type: 'contains', params: { substring: 'dist' } },
    ],
    timeout_ms: 20000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },
  {
    objective: 'Generate a tsconfig.json for a strict TypeScript project targeting ES2022 with Node16 module resolution, outputting to ./dist.',
    type: 'file-op',
    outputFormat: 'json',
    context: '',
    boundaries: ['Output valid JSON only', 'Include strict mode options'],
    postconditions: [
      { type: 'contains', params: { substring: '"strict"' } },
      { type: 'contains', params: { substring: 'ES2022' } },
      { type: 'contains', params: { substring: 'dist' } },
    ],
    timeout_ms: 20000,
    context_budget_tokens: 4096,
    expected_verdict: 'pass',
  },
];
