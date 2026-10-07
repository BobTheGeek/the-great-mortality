import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import * as engine from '../../src/engine/engine';
import { makeStrategies, type EngineApi } from '../../src/engine/harness';
import type { Spec } from '../../src/spec/types';
import { loadReferenceEngine } from '../helpers/reference-engine';

const reference = loadReferenceEngine() as EngineApi;
const spec = specRaw as unknown as Spec;

const mineStrategies = makeStrategies(engine);
const refStrategies = makeStrategies(reference);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

function fingerprint(s: Loose) {
  return {
    month: s.month,
    treasury: s.treasury,
    unrest: s.unrest,
    decreesLeft: s.decreesLeft,
    shipsHeld: s.shipsHeld,
    portClosed: s.portClosed,
    bathhousesClosed: s.bathhousesClosed,
    ended: s.ended,
    maxUnrest: s.maxUnrest,
    counters: s.counters,
    flags: s.flags,
    pending: s.pending,
    assist: [...s.assist].sort(),
    survival: engine.survival(s),
    towns: Object.fromEntries(
      Object.keys(s.towns)
        .sort()
        .map((id) => {
          const t = s.towns[id];
          return [
            id,
            {
              id: t.id,
              type: t.type,
              pop: t.pop,
              S: t.S,
              I: t.I,
              P: t.P,
              D: t.D,
              R: t.R,
              ratS: t.ratS,
              ratI: t.ratI,
              ratDeadTotal: t.ratDeadTotal,
              firstHumanCase: t.firstHumanCase,
              deadRatsSeen: t.deadRatsSeen,
              clean: t.clean,
              sealed: t.sealed,
              procession: t.procession,
              decreesHistory: t.decreesHistory,
              monthlyDeaths: t.monthlyDeaths,
              monthlyCases: t.monthlyCases,
            },
          ];
        }),
    ),
  };
}

for (const name of Object.keys(mineStrategies)) {
  test(`ported engine matches the reference month by month: ${name}`, () => {
    for (let seed = 1000; seed < 1008; seed++) {
      const a = engine.createRun(spec, { seed });
      const b = reference.createRun(spec, { seed }) as Loose;
      let repA: Loose = null;
      let repB: Loose = null;
      let guard = 0;
      while ((!a.ended || !b.ended) && guard < 30) {
        if (!a.ended) {
          mineStrategies[name]!(a, repA);
          repA = engine.endMonth(a);
        }
        if (!b.ended) {
          refStrategies[name]!(b, repB);
          repB = reference.endMonth(b);
        }
        expect({ fp: fingerprint(a), rep: repA }).toEqual({ fp: fingerprint(b), rep: repB });
        guard++;
      }
      expect(guard).toBeLessThan(30);
      expect(a.ended).toBe(b.ended);
      expect(engine.epithet(a)).toBe(reference.epithet(b));
    }
  });
}

test('autoplay after an overthrow matches the reference', () => {
  for (let seed = 1000; seed < 1006; seed++) {
    const a = engine.createRun(spec, { seed });
    const b = reference.createRun(spec, { seed }) as Loose;
    let repA: Loose = null;
    let repB: Loose = null;
    let guard = 0;
    while ((!a.ended || !b.ended) && guard < 30) {
      if (!a.ended) {
        mineStrategies['close the port all game']!(a, repA);
        repA = engine.endMonth(a);
      }
      if (!b.ended) {
        refStrategies['close the port all game']!(b, repB);
        repB = reference.endMonth(b);
      }
      guard++;
    }
    engine.autoplayToEnd(a);
    reference.autoplayToEnd(b);
    expect(fingerprint(a)).toEqual(fingerprint(b));
    expect(engine.epithet(a)).toBe(reference.epithet(b));
  }
});

test('autoplay after fleeing matches the reference', () => {
  const a = engine.createRun(spec, { seed: 123 });
  const b = reference.createRun(spec, { seed: 123 }) as Loose;
  expect(reference.issueDecree(b, 'hold-ships')).toEqual(engine.issueDecree(a, 'hold-ships'));
  expect(reference.issueDecree(b, 'flee')).toEqual(engine.issueDecree(a, 'flee'));
  engine.autoplayToEnd(a);
  reference.autoplayToEnd(b);
  expect(fingerprint(a)).toEqual(fingerprint(b));
  expect(engine.survival(a)).toBe(reference.survival(b));
});
