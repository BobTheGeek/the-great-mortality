import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import { loadSpec } from '../../src/spec/load';
import type { Spec } from '../../src/spec/types';
import { assertValidSpec, validateSpec } from '../../src/spec/validate';

const spec = specRaw as unknown as Spec;

test('the shipped spec validates with no errors', () => {
  const result = validateSpec(loadSpec());
  expect(result.errors).toEqual([]);
});

test('assertValidSpec does not throw for the shipped spec', () => {
  expect(() => assertValidSpec(loadSpec())).not.toThrow();
});

test('flags a second correct theory on a question', () => {
  const bad = structuredClone(spec) as Spec;
  bad.mystery.questions[0]!.theories[1]!.correct = true;
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('exactly one correct'))).toBe(true);
  expect(() => assertValidSpec(bad)).toThrow(/exactly one correct/);
});

test('flags markup that points at a missing codex term', () => {
  const bad = structuredClone(spec) as Spec;
  bad.opening.titleCard.body = 'A [[missing-term]] here.';
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('missing-term'))).toBe(true);
});

test('flags an unknown placeholder in copy', () => {
  const bad = structuredClone(spec) as Spec;
  bad.opening.narration[0] = 'A {bogus} line.';
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('bogus'))).toBe(true);
});

test('flags a solve rule that needs an unknown clue', () => {
  const bad = structuredClone(spec) as Spec;
  bad.mystery.questions[0]!.solveRule.all.push('c-not-real');
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('c-not-real'))).toBe(true);
});

test('flags a timeline pin with no chronicle', () => {
  const bad = structuredClone(spec) as Spec;
  bad.timeline.pins.push('no-such-chronicle');
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('no-such-chronicle'))).toBe(true);
});

test('flags a card whose earn condition points nowhere', () => {
  const bad = structuredClone(spec) as Spec;
  bad.cards[0]!.earn = 'clue:not-a-clue';
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('not-a-clue'))).toBe(true);
});

test('flags a chronicle unlock that points nowhere', () => {
  const bad = structuredClone(spec) as Spec;
  bad.chronicles[0]!.unlock = 'event:no-such-event';
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('no-such-event'))).toBe(true);
});

test('flags month flavors that do not cover twelve months', () => {
  const bad = structuredClone(spec) as Spec;
  bad.monthFlavors = ['Epiphany'];
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('monthFlavors'))).toBe(true);
});

test('flags unrest bands with a gap', () => {
  const bad = structuredClone(spec) as Spec;
  bad.unrestBands[1]!.min = 30;
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('unrestBands'))).toBe(true);
});

test('flags an advisor offer for an unknown decree', () => {
  const bad = structuredClone(spec) as Spec;
  bad.advisors[0]!.offers.push('lift:no-such-decree');
  const result = validateSpec(bad);
  expect(result.errors.some((e) => e.includes('no-such-decree'))).toBe(true);
});
