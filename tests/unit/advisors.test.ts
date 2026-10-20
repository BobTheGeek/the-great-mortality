import { describe, expect, it } from 'vitest';
import {
  advisorForMonth,
  advisorLine,
  advisorOffer,
  applyPendingOffer,
  offerTown,
  shellRandom,
} from '../../src/app/advisors';
import { createRun, endMonth } from '../../src/engine/engine';
import type { RunState } from '../../src/engine/types';
import { loadSpec } from '../../src/spec/load';

const spec = loadSpec();

function freshRun(seed = 7): RunState {
  return createRun(spec, { seed });
}

function advisorById(id: string) {
  return spec.advisors.find((a) => a.id === id)!;
}

describe('advisor schedule', () => {
  it('introduces each advisor once in months 0-3, in order', () => {
    const run = freshRun();
    const ids = [0, 1, 2, 3].map((m) => advisorForMonth(spec, run, m)?.id);
    expect(ids).toEqual(['merchant', 'physician', 'priest', 'astrologer']);
  });

  it('is deterministic for a given seed and month', () => {
    const run = freshRun(42);
    for (const month of [4, 5, 6, 7, 12, 17]) {
      const a = advisorForMonth(spec, run, month)?.id ?? null;
      const b = advisorForMonth(spec, run, month)?.id ?? null;
      expect(b).toBe(a);
    }
  });

  it('never shows the same advisor twice in a row from month 4 on', () => {
    for (const seed of [1, 2, 3, 11, 77, 1234]) {
      const run = freshRun(seed);
      let last: string | null = null;
      for (let month = 0; month <= 17; month++) {
        const advisor = advisorForMonth(spec, run, month);
        if (!advisor) continue;
        expect(advisor.id).not.toBe(last);
        last = advisor.id;
        run.flags['adv:last'] = advisor.id;
      }
    }
  });

  it('shows an advisor in roughly 40% of months from month 4', () => {
    let shown = 0;
    for (const seed of Array.from({ length: 40 }, (_, i) => i + 1)) {
      const run = freshRun(seed);
      for (let month = 4; month <= 17; month++) {
        if (advisorForMonth(spec, run, month)) shown++;
      }
    }
    const ratio = shown / (40 * 14);
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.55);
  });

  it('shellRandom is deterministic and stays in [0, 1)', () => {
    for (const seed of [0, 1, 999]) {
      const a = shellRandom(seed, 0x1234, 5);
      const b = shellRandom(seed, 0x1234, 5);
      expect(a).toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
    }
  });
});

describe('advisor lines', () => {
  it('picks the winter pool in December through February', () => {
    const run = freshRun();
    const physician = advisorById('physician');
    // month index 1 = December 1347
    const line = advisorLine(spec, run, physician, 1);
    expect(physician.lines.winter).toContain(line.text);
  });

  it('picks the spreading pool once any town has burials', () => {
    const run = freshRun();
    run.towns['santa-lucia']!.D = 10;
    const physician = advisorById('physician');
    const line = advisorLine(spec, run, physician, 5);
    expect(physician.lines.spreading).toContain(line.text);
  });

  it('does not repeat a line within a run while alternatives exist', () => {
    const run = freshRun();
    run.towns['santa-lucia']!.D = 10; // spreading context
    const priest = advisorById('priest');
    const seen = new Set<string>();
    for (let i = 0; i < priest.lines.spreading!.length; i++) {
      const line = advisorLine(spec, run, priest, 5);
      expect(seen.has(line.text)).toBe(false);
      seen.add(line.text);
      run.flags[`advline:${priest.id}:${line.index}`] = true;
    }
    // once exhausted it wraps deterministically
    const again = advisorLine(spec, run, priest, 5);
    expect(again.index).toBe(0);
  });
});

describe('advisor offers', () => {
  it('offers the port town when no town has burials yet', () => {
    const run = freshRun();
    expect(offerTown(spec, run)).toBe(spec.sim.portTown);
  });

  it('offers the most buried town otherwise', () => {
    const run = freshRun();
    run.towns['santa-lucia']!.D = 12;
    run.towns['collina']!.D = 40;
    expect(offerTown(spec, run)).toBe('collina');
  });

  it('lets the physician offer burn herbs, with the cost', () => {
    const run = freshRun();
    const offer = advisorOffer(spec, run, advisorById('physician'));
    expect(offer).not.toBeNull();
    expect(offer!.decreeId).toBe('burn-herbs');
    expect(offer!.kind).toBe('decree');
    expect(offer!.townId).toBe(spec.sim.portTown);
    expect(offer!.cost).toBe(spec.decrees.find((d) => d.id === 'burn-herbs')!.cost);
  });

  it('shows no offer when nothing is affordable or valid', () => {
    const run = freshRun();
    run.treasury = 10;
    expect(advisorOffer(spec, run, advisorById('physician'))).toBeNull();
    expect(advisorOffer(spec, run, advisorById('merchant'))).toBeNull();
  });

  it('lets the merchant offer only lifts of active decrees', () => {
    const run = freshRun();
    const merchant = advisorById('merchant');
    expect(advisorOffer(spec, run, merchant)).toBeNull();
    run.shipsHeld = true;
    const offer = advisorOffer(spec, run, merchant);
    expect(offer).toEqual({ id: 'lift:hold-ships', kind: 'lift', decreeId: 'hold-ships', cost: 0 });
    run.portClosed = true;
    expect(advisorOffer(spec, run, merchant)!.decreeId).toBe('hold-ships');
    run.shipsHeld = false;
    expect(advisorOffer(spec, run, merchant)!.decreeId).toBe('close-port');
  });
});

describe('applying an accepted offer', () => {
  it('issues the decree at the start of the next month and spends a slot', () => {
    const run = freshRun();
    endMonth(run);
    const before = run.treasury;
    run.flags['advoffer:id'] = 'burn-herbs';
    run.flags['advoffer:town'] = 'portoreale';
    const applied = applyPendingOffer(spec, run);
    expect(applied).toEqual({ decreeId: 'burn-herbs', townId: 'portoreale', lifted: false });
    expect(run.decreesLeft).toBe(1);
    expect(run.treasury).toBe(before - 150);
    expect(run.flags['advoffer:id']).toBeUndefined();
    expect(run.towns['portoreale']!.decreesHistory.some((d) => d.id === 'burn-herbs')).toBe(true);
  });

  it('lifts an active decree for free', () => {
    const run = freshRun();
    run.shipsHeld = true;
    run.flags['advoffer:id'] = 'lift:hold-ships';
    const applied = applyPendingOffer(spec, run);
    expect(applied?.lifted).toBe(true);
    expect(run.shipsHeld).toBe(false);
    expect(run.decreesLeft).toBe(2);
  });

  it('drops an offer that is no longer valid', () => {
    const run = freshRun();
    run.flags['advoffer:id'] = 'lift:hold-ships'; // not currently held
    expect(applyPendingOffer(spec, run)).toBeNull();
    expect(run.flags['advoffer:id']).toBeUndefined();
    run.flags['advoffer:id'] = 'burn-herbs';
    run.ended = 'fled';
    expect(applyPendingOffer(spec, run)).toBeNull();
  });
});
