import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import type { Spec } from '../../src/spec/types';
import { unrestAlarm, unrestBandWord } from '../../src/skin/unrest';

const spec = specRaw as unknown as Spec;

test('unrest band words come from the spec bands', () => {
  expect(unrestBandWord(spec, 0)).toBe('quiet streets');
  expect(unrestBandWord(spec, 21)).toBe('quiet streets');
  expect(unrestBandWord(spec, 25)).toBe('grumbling at the quay');
  expect(unrestBandWord(spec, 49)).toBe('grumbling at the quay');
  expect(unrestBandWord(spec, 50)).toBe('stones thrown at the palazzo');
  expect(unrestBandWord(spec, 60)).toBe('stones thrown at the palazzo');
  expect(unrestBandWord(spec, 75)).toBe('the council whispers');
  expect(unrestBandWord(spec, 99)).toBe('the council whispers');
});

test('unrest at one hundred clamps to the top band word', () => {
  expect(unrestBandWord(spec, 100)).toBe('the council whispers');
});

test('the alarm turns on at sixty', () => {
  expect(unrestAlarm(59)).toBe(false);
  expect(unrestAlarm(60)).toBe(true);
  expect(unrestAlarm(100)).toBe(true);
});
