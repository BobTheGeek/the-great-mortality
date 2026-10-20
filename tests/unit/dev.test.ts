import { describe, expect, it } from 'vitest';
import { skipMonths, unlockAll, unlockSummaryText } from '../../src/app/dev';
import { createRun } from '../../src/engine/engine';
import { loadSpec } from '../../src/spec/load';
import { createPersistentState } from '../../src/shell/state';

const spec = loadSpec();

describe('dev helpers', () => {
  it('skips months up to the target', () => {
    const run = createRun(spec, { seed: 1 });
    expect(skipMonths(run, 5)).toBe(5);
    expect(run.month).toBe(5);
  });

  it('stops at the end of a run and never goes backwards', () => {
    const run = createRun(spec, { seed: 1 });
    run.month = 17;
    expect(skipMonths(run, 30)).toBe(1);
    expect(run.ended).toBe('normal');
    expect(skipMonths(run, 30)).toBe(0);
    expect(skipMonths(run, 3)).toBe(0);
  });

  it('unlocks every collection exactly once', () => {
    const persistent = createPersistentState();
    const summary = unlockAll(spec, persistent);
    expect(summary.clues).toBe(spec.mystery.clues.length);
    expect(summary.terms).toBe(spec.codex.length);
    expect(summary.chronicles).toBe(spec.chronicles.length);
    expect(summary.cards).toBe(spec.cards.length);
    expect(summary.epithets).toBe(spec.epithets.order.length);
    expect(persistent.lensUnlocked).toBe(true);
    expect(persistent.codexRead.length).toBe(spec.codex.length);
    expect(unlockSummaryText(summary)).toContain('Unlocked');
    const again = unlockAll(spec, persistent);
    expect(unlockSummaryText(again)).toBe('Everything was already unlocked.');
  });
});
