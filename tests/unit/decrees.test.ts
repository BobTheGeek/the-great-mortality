import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import { createRun, issueDecree } from '../../src/engine/engine';
import type { Spec } from '../../src/spec/types';
import { deriveDecreeRow } from '../../src/skin/decrees';

const spec = specRaw as unknown as Spec;

test('an affordable idle decree is idle with its spec copy', () => {
  const run = createRun(spec, { seed: 1 });
  const row = deriveDecreeRow(spec, run, 'seal-roads', null);
  expect(row.state).toBe('idle');
  expect(row.name).toBe("Seal a town's roads");
  expect(row.cost).toBe(600);
  expect(row.target).toBe('town');
});

test('a decree awaiting a town shows the selected state', () => {
  const run = createRun(spec, { seed: 1 });
  const row = deriveDecreeRow(spec, run, 'seal-roads', 'seal-roads');
  expect(row.state).toBe('selected');
  expect(row.description).toBe('Now tap a town on the map.');
});

test('an issued toggle is active and shows the in-force description', () => {
  const run = createRun(spec, { seed: 1 });
  issueDecree(run, 'hold-ships');
  const row = deriveDecreeRow(spec, run, 'hold-ships', null);
  expect(row.state).toBe('active');
  expect(row.activeCount).toBe(1);
  expect(row.description).toBe('In force · tap to lift');
});

test('sealed roads count active towns', () => {
  const run = createRun(spec, { seed: 1 });
  issueDecree(run, 'seal-roads', 'portoreale');
  issueDecree(run, 'seal-roads', 'collina');
  const row = deriveDecreeRow(spec, run, 'seal-roads', null);
  expect(row.state).toBe('active');
  expect(row.activeCount).toBe(2);
});

test('an unaffordable decree is unaffordable with the needs line', () => {
  const run = createRun(spec, { seed: 1 });
  run.treasury = 0;
  const row = deriveDecreeRow(spec, run, 'close-port', null);
  expect(row.state).toBe('unaffordable');
  expect(row.description).toBe('Not enough florins · needs 900');
});

test('flee is always destructive', () => {
  const run = createRun(spec, { seed: 1 });
  const row = deriveDecreeRow(spec, run, 'flee', null);
  expect(row.state).toBe('destructive');
  expect(row.cost).toBe(0);
});

test('an active toggle beats the unaffordable state', () => {
  const run = createRun(spec, { seed: 1 });
  issueDecree(run, 'hold-ships');
  run.treasury = 0;
  expect(deriveDecreeRow(spec, run, 'hold-ships', null).state).toBe('active');
});

test('a town decree with a town already chosen skips the map step', () => {
  const run = createRun(spec, { seed: 1 });
  const row = deriveDecreeRow(spec, run, 'seal-roads', null, true);
  expect(row.state).toBe('idle');
  expect(row.needsTown).toBe(false);
});
