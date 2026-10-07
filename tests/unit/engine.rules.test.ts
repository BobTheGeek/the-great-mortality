import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import {
  createRun,
  endMonth,
  epithet,
  issueDecree,
  liftDecree,
  survival,
} from '../../src/engine/engine';
import type { Spec } from '../../src/spec/types';

const spec = specRaw as unknown as Spec;

test('unknown decree ids throw', () => {
  const s = createRun(spec, { seed: 1 });
  expect(() => issueDecree(s, 'not-a-decree')).toThrow();
});

test('a third decree in one month is refused for lack of slots', () => {
  const s = createRun(spec, { seed: 1 });
  expect(issueDecree(s, 'burn-herbs', 'portoreale').ok).toBe(true);
  expect(issueDecree(s, 'hire-physicians', 'portoreale').ok).toBe(true);
  expect(issueDecree(s, 'clean-streets', 'portoreale')).toMatchObject({
    ok: false,
    reason: 'no-slots',
  });
  expect(s.decreesLeft).toBe(0);
});

test('a decree the treasury cannot afford is refused', () => {
  const s = createRun(spec, { seed: 1 });
  s.treasury = 0;
  expect(issueDecree(s, 'close-port')).toMatchObject({ ok: false, reason: 'unaffordable' });
});

test('a town decree without a town is refused', () => {
  const s = createRun(spec, { seed: 1 });
  expect(issueDecree(s, 'seal-roads')).toMatchObject({ ok: false, reason: 'needs-town' });
});

test('flee ends the run immediately', () => {
  const s = createRun(spec, { seed: 1 });
  expect(issueDecree(s, 'flee')).toMatchObject({ ok: true, ended: 'fled' });
  expect(s.ended).toBe('fled');
});

test('lifting a toggle is free and uses no decree slot', () => {
  const s = createRun(spec, { seed: 1 });
  issueDecree(s, 'hold-ships');
  const slots = s.decreesLeft;
  expect(s.shipsHeld).toBe(true);
  liftDecree(s, 'hold-ships');
  expect(s.shipsHeld).toBe(false);
  expect(s.decreesLeft).toBe(slots);
});

test('cleaning the streets kills fifteen percent of the rats and cannot repeat', () => {
  const s = createRun(spec, { seed: 1 });
  const before = s.towns.portoreale!.ratS;
  expect(issueDecree(s, 'clean-streets', 'portoreale').ok).toBe(true);
  expect(s.towns.portoreale!.ratS).toBeCloseTo(before * 0.85, 10);
  expect(issueDecree(s, 'clean-streets', 'portoreale')).toMatchObject({
    ok: false,
    reason: 'done',
  });
});

test('unrest at or above one hundred ends the run as overthrown', () => {
  const s = createRun(spec, { seed: 1 });
  s.unrest = 99;
  s.portClosed = true;
  const report = endMonth(s);
  expect(report.ended).toBe('overthrown');
  expect(s.ended).toBe('overthrown');
});

test('the fled epithet outranks every other rule', () => {
  const s = createRun(spec, { seed: 1 });
  s.ended = 'fled';
  s.counters.portClosedMonths = 18;
  expect(epithet(s)).toBe('the-fled');
});

test('twelve closed port months earns the iron gate', () => {
  const s = createRun(spec, { seed: 1 });
  s.counters.portClosedMonths = 12;
  expect(epithet(s)).toBe('the-iron-gate');
});

test('the wise needs 75 percent survival and six quarantine months', () => {
  const s = createRun(spec, { seed: 1 });
  s.counters.shipsHeldMonths = 6;
  expect(survival(s)).toBe(1);
  expect(epithet(s)).toBe('the-wise');
});

test('survival is the living share of the starting population', () => {
  const s = createRun(spec, { seed: 1 });
  const total = Object.values(s.towns).reduce((a, t) => a + t.pop, 0);
  s.towns.portoreale!.D = 300;
  expect(survival(s)).toBeCloseTo(1 - 300 / total, 10);
});
