import { describe, expect, it } from 'vitest';
import { hasHistory, nameChoices, namePageCount, saveSummary } from '../../src/app/opening';
import { createRun } from '../../src/engine/engine';
import { loadSpec } from '../../src/spec/load';
import { createPersistentState } from '../../src/shell/state';

const spec = loadSpec();

describe('opening helpers', () => {
  it('has no history on a blank ledger', () => {
    expect(hasHistory(spec, createPersistentState(), null)).toBe(false);
  });

  it('has history once a run exists or anything was earned', () => {
    const run = createRun(spec, { seed: 1 });
    expect(hasHistory(spec, createPersistentState(), run)).toBe(true);
    const persistent = createPersistentState();
    persistent.cluesFound.push('c-galleys');
    expect(hasHistory(spec, persistent, null)).toBe(true);
  });

  it('summarizes a saved run', () => {
    const run = createRun(spec, { seed: 1, stewardName: 'Lorenzo' });
    expect(saveSummary(spec, run)).toBe('Lorenzo · November 1347 · 6 towns healthy');
    run.towns['santa-lucia']!.D = 100;
    expect(saveSummary(spec, run)).toBe('Lorenzo · November 1347 · 5 towns healthy');
  });

  it('rotates the name pool four at a time and wraps', () => {
    const page0 = nameChoices(spec, 0);
    expect(page0).toHaveLength(4);
    expect(page0).toEqual(spec.opening.namePool.slice(0, 4));
    const page1 = nameChoices(spec, 1);
    expect(page1[0]).toBe(spec.opening.namePool[4]);
    expect(nameChoices(spec, namePageCount(spec))).toEqual(page0);
  });
});
