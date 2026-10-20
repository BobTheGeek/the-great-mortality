import { describe, expect, it } from 'vitest';
import {
  citationFor,
  endingView,
  reckoningView,
} from '../../src/app/endings';
import { finalizeEpithet } from '../../src/app/progress';
import { createRun, endMonth } from '../../src/engine/engine';
import type { RunState } from '../../src/engine/types';
import { loadSpec } from '../../src/spec/load';
import { createPersistentState } from '../../src/shell/state';

const spec = loadSpec();

function freshRun(seed = 7): RunState {
  return createRun(spec, { seed });
}

describe('epithet citations', () => {
  it('falls back to watching and waiting with no actions', () => {
    const run = freshRun();
    expect(citationFor(spec, run)).toBe(spec.epithets.actionPhrases.none);
  });

  it('joins the two most-used actions', () => {
    const run = freshRun();
    run.counters.shipsHeldMonths = 9;
    run.counters.sealMonths = 4;
    run.counters.processions = 2;
    expect(citationFor(spec, run)).toBe(
      `${spec.epithets.actionPhrases.shipsHeld} and ${spec.epithets.actionPhrases.sealed}`,
    );
  });

  it('uses a single action when only one was taken', () => {
    const run = freshRun();
    run.counters.physicians = 3;
    expect(citationFor(spec, run)).toBe(spec.epithets.actionPhrases.physicians);
  });
});

describe('reckoning view', () => {
  it('computes survival, souls, town bars, and the epithet citation', () => {
    const run = freshRun(5);
    const persistent = createPersistentState();
    endMonth(run);
    const view = reckoningView(spec, persistent, run);
    expect(view.survivalPct).toBeGreaterThanOrEqual(0);
    expect(view.survivalPct).toBeLessThanOrEqual(100);
    expect(view.soulsLabel).toContain('souls');
    expect(view.towns).toHaveLength(spec.towns.length);
    expect(view.towns.every((t) => t.pct <= 100 && t.pct >= 0)).toBe(true);
    expect(view.epithet.name.length).toBeGreaterThan(0);
    expect(view.epithet.citation.length).toBeGreaterThan(0);
  });

  it('marks a town spared only with no burials, and counts this run\'s unlocks', () => {
    const run = freshRun(5);
    const persistent = createPersistentState();
    run.flags['solved:q1'] = true;
    run.flags['new:chronicle:ships-from-caffa'] = true;
    run.flags['new:card:beaked-mask'] = true;
    run.flags['new:codex:florin'] = true;
    run.flags['new:codex:galley'] = true;
    const view = reckoningView(spec, persistent, run);
    expect(view.towns.find((t) => t.id === spec.sim.isolatedTown)!.spared).toBe(true);
    expect(view.mystery.newSolved).toBe(1);
    expect(view.newCounts).toEqual({ chronicles: 1, cards: 1, codex: 2 });
  });
});

describe('ending view', () => {
  it('labels the ending month captured before the autoplay', () => {
    const run = freshRun(5);
    run.ended = 'fled';
    run.flags['shell:endMonth'] = '0';
    const view = endingView(spec, createPersistentState(), run);
    expect(view.kind).toBe('fled');
    expect(view.epithetWord).toBe('the Fled');
    expect(view.label).toBe('NOVEMBER 1347 · MONTH 1 OF 18');
  });

  it('uses the overthrown copy and current month when no flag was recorded', () => {
    const run = freshRun(5);
    run.month = 10; // September 1348
    run.ended = 'overthrown';
    const view = endingView(spec, createPersistentState(), run);
    expect(view.kind).toBe('overthrown');
    expect(view.epithetWord).toBe('the Overthrown');
    expect(view.label).toBe('SEPTEMBER 1348 · MONTH 11 OF 18');
    expect(view.unrest).toBe(Math.round(run.unrest));
  });
});

describe('finalize epithet', () => {
  it('records the epithet once', () => {
    const run = freshRun(5);
    run.ended = 'fled';
    const persistent = createPersistentState();
    const first = finalizeEpithet(spec, persistent, run);
    expect(first.id).toBe('the-fled');
    expect(first.isNew).toBe(true);
    const second = finalizeEpithet(spec, persistent, run);
    expect(second.isNew).toBe(false);
    expect(persistent.epithetsEarned).toEqual(['the-fled']);
  });
});
