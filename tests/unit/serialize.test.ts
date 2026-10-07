import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import * as engine from '../../src/engine/engine';
import { makeStrategies } from '../../src/engine/harness';
import { hydrateRun, serializeRun } from '../../src/engine/serialize';
import type { Spec } from '../../src/spec/types';

const spec = specRaw as unknown as Spec;
const strategies = makeStrategies(engine);

test('a resumed run continues identically to an uninterrupted one', () => {
  const play = strategies['smart (hold ships, clean port + market, seal ravaged towns)']!;
  const original = engine.createRun(spec, { seed: 777, assistClues: ['c-ragman'] });
  let rep: ReturnType<typeof engine.endMonth> | null = null;
  for (let m = 0; m < 5; m++) {
    play(original, rep);
    rep = engine.endMonth(original);
  }
  expect(original.month).toBe(5);
  expect(original.ended).toBe(null);

  const saved = serializeRun(original);
  const resumed = hydrateRun(spec, saved);
  expect(serializeRun(resumed)).toEqual(saved);

  let repA = rep;
  let repB = rep;
  let guard = 0;
  while ((!original.ended || !resumed.ended) && guard < 30) {
    if (!original.ended) {
      play(original, repA);
      repA = engine.endMonth(original);
    }
    if (!resumed.ended) {
      play(resumed, repB);
      repB = engine.endMonth(resumed);
    }
    expect(serializeRun(resumed)).toEqual(serializeRun(original));
    guard++;
  }
  expect(guard).toBeLessThan(30);
  expect(engine.survival(resumed)).toBe(engine.survival(original));
  expect(engine.epithet(resumed)).toBe(engine.epithet(original));
});

test('serialization preserves the assist clues, flags and pending checks', () => {
  const s = engine.createRun(spec, { seed: 31, assistClues: ['c-dead-rats', 'c-ragman'] });
  s.flags['quarantineClueArmed'] = true;
  s.pending.push({ clue: 'c-herb-fires', town: 'collina', month: 2, casesBefore: 4 });
  const saved = serializeRun(s);
  const resumed = hydrateRun(spec, saved);
  expect([...resumed.assist].sort()).toEqual(['c-dead-rats', 'c-ragman']);
  expect(resumed.flags.quarantineClueArmed).toBe(true);
  expect(resumed.pending).toEqual(s.pending);
  expect(serializeRun(resumed)).toEqual(saved);
});

test('hydrate refuses unknown serialization versions', () => {
  const s = engine.createRun(spec, { seed: 1 });
  const saved = serializeRun(s);
  const bad = { ...saved, v: 99 };
  expect(() => hydrateRun(spec, bad)).toThrow();
});
