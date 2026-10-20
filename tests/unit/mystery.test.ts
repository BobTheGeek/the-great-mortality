import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import type { Spec } from '../../src/spec/types';
import { createPersistentState } from '../../src/shell/state';
import {
  allQuestionsSolved,
  clueCountFor,
  evaluateTheory,
  isQuestionSolved,
  ruleMet,
  solveQuestion,
} from '../../src/app/mystery';

const spec = specRaw as unknown as Spec;

test('the rule for question one needs the galleys plus one confirming clue', () => {
  const q1 = spec.mystery.questions[0]!;
  expect(ruleMet(q1, new Set(['c-galleys']))).toBe(false);
  expect(ruleMet(q1, new Set(['c-galleys', 'c-quarantined-galley']))).toBe(true);
  expect(ruleMet(q1, new Set(['c-galleys', 'c-no-road']))).toBe(true);
});

test('the correct theory without enough proof is a not-yet verdict', () => {
  const persistent = createPersistentState();
  const verdict = evaluateTheory(spec, persistent, 'q1', 'q1-east');
  expect(verdict.state).toBe('notYet');
  expect(verdict.hint).toBe(spec.mystery.questions[0]!.notYetHint);
});

test('the correct theory with the rule met is solved with the spec summary', () => {
  const persistent = createPersistentState();
  persistent.cluesFound.push('c-galleys', 'c-quarantined-galley');
  const verdict = evaluateTheory(spec, persistent, 'q1', 'q1-east');
  expect(verdict.state).toBe('solved');
  expect(verdict.summary).toBe(spec.mystery.questions[0]!.solvedSummary);
});

test('a wrong theory with no contradicting clue points back to watching the months', () => {
  const persistent = createPersistentState();
  const verdict = evaluateTheory(spec, persistent, 'q1', 'q1-air');
  expect(verdict.state).toBe('wrong');
  expect(verdict.text).toBe(spec.mystery.verdicts.wrong.noClueText);
  expect(verdict.clue).toBeUndefined();
});

test('a wrong theory shows the first found clue that speaks against it', () => {
  const persistent = createPersistentState();
  persistent.cluesFound.push('c-herb-fires', 'c-no-road');
  const verdict = evaluateTheory(spec, persistent, 'q1', 'q1-air');
  expect(verdict.state).toBe('wrong');
  expect(verdict.clue?.id).toBe('c-no-road');
});

test('religious theories carry the respectful lead-in', () => {
  const persistent = createPersistentState();
  const verdict = evaluateTheory(spec, persistent, 'q2', 'q2-judgment');
  expect(verdict.state).toBe('wrong');
  expect(verdict.religious).toBe(true);
});

test('clue counts count the found clues pinned to a question', () => {
  const persistent = createPersistentState();
  persistent.cluesFound.push('c-quarantined-galley', 'c-ragman', 'c-dead-rats');
  expect(clueCountFor(spec, persistent, 'q2')).toBe(2);
  expect(clueCountFor(spec, persistent, 'q3')).toBe(2);
  expect(clueCountFor(spec, persistent, 'q4')).toBe(0);
});

test('solving records once and all-questions-solved needs all four', () => {
  const persistent = createPersistentState();
  solveQuestion(persistent, 'q1');
  solveQuestion(persistent, 'q1');
  expect(persistent.mysterySolved).toEqual(['q1']);
  expect(isQuestionSolved(persistent, 'q1')).toBe(true);
  expect(allQuestionsSolved(spec, persistent)).toBe(false);
  solveQuestion(persistent, 'q2');
  solveQuestion(persistent, 'q3');
  solveQuestion(persistent, 'q4');
  expect(allQuestionsSolved(spec, persistent)).toBe(true);
});
