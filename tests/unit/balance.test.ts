import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import { runBalance, runMysteryPacing, type StrategySummary } from '../../src/engine/harness';
import type { Spec } from '../../src/spec/types';

const spec = specRaw as unknown as Spec;

const TARGETS: Record<string, number> = {
  'do nothing': 58,
  'herbs + physicians (medieval medicine)': 58,
  'processions everywhere': 38,
  'hold ships only': 64,
  'close the port all game': 69,
  'careful (hold ships + clean port and market, nothing else)': 73,
  'smart (hold ships, clean port + market, seal ravaged towns)': 83,
};

let cached: StrategySummary[] | null = null;
function balance(): StrategySummary[] {
  cached ??= runBalance(spec, 300);
  return cached;
}

test('every strategy lands within 5 points of the ADDENDUM balance table', () => {
  const byName = new Map(balance().map((r) => [r.name, r]));
  for (const [name, target] of Object.entries(TARGETS)) {
    const result = byName.get(name);
    expect(result, `missing strategy ${name}`).toBeDefined();
    expect(Math.abs(result!.avgSurvival * 100 - target), name).toBeLessThanOrEqual(5);
  }
});

test('reproduces the published balance numbers for the shipped spec', () => {
  const byName = new Map(balance().map((r) => [r.name, r]));
  const expected: Record<string, number> = {
    'do nothing': 57.8,
    'smart (hold ships, clean port + market, seal ravaged towns)': 83.0,
    'careful (hold ships + clean port and market, nothing else)': 72.8,
    'hold ships only': 63.7,
    'close the port all game': 69.2,
    'processions everywhere': 38.5,
    'herbs + physicians (medieval medicine)': 57.8,
  };
  for (const [name, value] of Object.entries(expected)) {
    expect(byName.get(name)!.avgSurvival * 100, name).toBeCloseTo(value, 0);
  }
});

test('the ordering of the balance table holds', () => {
  const byName = new Map(balance().map((r) => [r.name, r]));
  const avg = (n: string) => byName.get(n)!.avgSurvival * 100;
  expect(avg('processions everywhere')).toBeLessThan(avg('do nothing'));
  expect(
    Math.abs(
      avg('do nothing') - avg('herbs + physicians (medieval medicine)'),
    ),
  ).toBeLessThanOrEqual(3);
  expect(avg('do nothing')).toBeLessThan(avg('hold ships only'));
  expect(avg('hold ships only')).toBeLessThan(
    avg('careful (hold ships + clean port and market, nothing else)'),
  );
  expect(avg('careful (hold ships + clean port and market, nothing else)')).toBeLessThan(
    avg('smart (hold ships, clean port + market, seal ravaged towns)'),
  );
});

test('closing the port is a tradeoff: about three quarters of those runs end overthrown', () => {
  const byName = new Map(balance().map((r) => [r.name, r]));
  const result = byName.get('close the port all game')!;
  expect(result.overthrownShare).toBeGreaterThanOrEqual(0.7);
  expect(result.overthrownShare).toBeLessThanOrEqual(0.8);
});

test('stewardships needed to solve the whole mystery: median 3, p90 4, max 5', () => {
  expect(runMysteryPacing(spec, 300)).toEqual({ median: 3, p90: 4, max: 5 });
});
