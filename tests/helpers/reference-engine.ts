import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function loadReferenceEngine(): unknown {
  const path = fileURLToPath(
    new URL('../../design_handoff_great_mortality/reference/engine.js', import.meta.url),
  );
  const source = readFileSync(path, 'utf8');
  const moduleShim: { exports: unknown } = { exports: {} };
  const evaluate = new Function('module', 'exports', source);
  evaluate(moduleShim, moduleShim.exports);
  return moduleShim.exports;
}
