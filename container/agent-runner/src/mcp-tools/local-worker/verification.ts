import type { T0Check, VerificationResult, VerificationCheckResult, OutputFormat } from './contract.js';

function checkJsonValid(output: string): VerificationCheckResult {
  try {
    JSON.parse(output);
    return { type: 'json-valid', passed: true };
  } catch (e) {
    return { type: 'json-valid', passed: false, detail: (e as Error).message };
  }
}

function checkContains(output: string, params: Record<string, string>): VerificationCheckResult {
  const { substring } = params;
  const passed = output.includes(substring);
  return { type: 'contains', passed, ...(passed ? {} : { detail: `Missing substring: "${substring}"` }) };
}

function checkNotContains(output: string, params: Record<string, string>): VerificationCheckResult {
  const { substring } = params;
  const passed = !output.includes(substring);
  return { type: 'not-contains', passed, ...(passed ? {} : { detail: `Found unwanted substring: "${substring}"` }) };
}

function checkRegex(output: string, params: Record<string, string>): VerificationCheckResult {
  const { pattern } = params;
  try {
    const re = new RegExp(pattern);
    const passed = re.test(output);
    return { type: 'regex', passed, ...(passed ? {} : { detail: `Pattern /${pattern}/ did not match` }) };
  } catch (e) {
    return { type: 'regex', passed: false, detail: `Invalid regex: ${(e as Error).message}` };
  }
}

function checkLineCount(output: string, params: Record<string, string>): VerificationCheckResult {
  const lines = output.split('\n').length;
  const min = params.min != null ? parseInt(params.min, 10) : 0;
  const max = params.max != null ? parseInt(params.max, 10) : Infinity;
  const passed = lines >= min && lines <= max;
  return {
    type: 'line-count',
    passed,
    ...(passed ? {} : { detail: `Line count ${lines} outside range [${min}, ${max}]` }),
  };
}

function runCheck(output: string, check: T0Check): VerificationCheckResult {
  switch (check.type) {
    case 'json-valid':
      return checkJsonValid(output);
    case 'contains':
      return checkContains(output, check.params);
    case 'not-contains':
      return checkNotContains(output, check.params);
    case 'regex':
      return checkRegex(output, check.params);
    case 'line-count':
      return checkLineCount(output, check.params);
    default:
      return { type: check.type, passed: false, detail: `Unknown check type: ${check.type}` };
  }
}

export function verify(output: string, postconditions: T0Check[], outputFormat?: OutputFormat): VerificationResult {
  let checks = postconditions;

  if (outputFormat === 'json' && checks.length === 0) {
    checks = [{ type: 'json-valid', params: {} }];
  }

  const results = checks.map((c) => runCheck(output, c));
  return {
    passed: results.every((r) => r.passed),
    checks: results,
  };
}
