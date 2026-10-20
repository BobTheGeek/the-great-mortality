import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import { createRun } from '../../src/engine/engine';
import type { Spec } from '../../src/spec/types';
import { createPersistentState } from '../../src/shell/state';
import {
  applyRunCompletion,
  assistCluesFor,
  earnedCaption,
  grantClue,
  grantDecree,
  grantLens,
  grantOpening,
  grantQuestionSolved,
  grantRunEnd,
  grantTownBurned,
  isCardEarned,
  isChronicleUnlocked,
  markTermsSeen,
} from '../../src/app/progress';

const spec = specRaw as unknown as Spec;
const ctx = { month: 3 };

test('the opening grants the Ships from Caffa chronicle once', () => {
  const persistent = createPersistentState();
  expect(isChronicleUnlocked(persistent, 'ships-from-caffa')).toBe(false);
  const events = grantOpening(spec, persistent);
  expect(events).toEqual([{ kind: 'chronicle', id: 'ships-from-caffa' }]);
  expect(grantOpening(spec, persistent)).toEqual([]);
});

test('marking terms seen returns only the new ones and dedupes', () => {
  const persistent = createPersistentState();
  const first = markTermsSeen(spec, persistent, ['A [[steward]] and a [[quarantine]].']);
  expect(first.map((e) => e.id).sort()).toEqual(['quarantine', 'steward']);
  const second = markTermsSeen(spec, persistent, ['Another [[steward]] line.']);
  expect(second).toEqual([]);
});

test('the quarantined galley clue opens the Forty Days chronicle and its card', () => {
  const persistent = createPersistentState();
  const events = grantClue(spec, persistent, 'c-quarantined-galley', ctx);
  expect(isChronicleUnlocked(persistent, 'forty-days')).toBe(true);
  expect(isCardEarned(persistent, 'quarantine-modern')).toBe(true);
  expect(events).toEqual([
    { kind: 'chronicle', id: 'forty-days' },
    { kind: 'card', id: 'quarantine-modern' },
  ]);
  expect(grantClue(spec, persistent, 'c-quarantined-galley', ctx)).toEqual([]);
});

test('issuing a decree earns its card with month metadata', () => {
  const persistent = createPersistentState();
  const events = grantDecree(spec, persistent, 'hire-physicians', { month: 2 });
  expect(events).toEqual([{ kind: 'card', id: 'beaked-mask' }]);
  expect(persistent.cardMeta['beaked-mask']).toMatchObject({ month: 2 });
});

test('a burned-out town earns the ring-around card with its town recorded', () => {
  const persistent = createPersistentState();
  const run = createRun(spec, { seed: 1 });
  run.towns.portoreale!.D = run.towns.portoreale!.pop * 0.6;
  const events = grantTownBurned(spec, persistent, run, ctx);
  expect(events).toEqual([{ kind: 'card', id: 'ring-around' }]);
  expect(persistent.cardMeta['ring-around']).toMatchObject({ town: 'portoreale' });
});

test('the end of a run opens the Great Mortality chronicle and names the card', () => {
  const persistent = createPersistentState();
  const events = grantRunEnd(spec, persistent, ctx);
  expect(isChronicleUnlocked(persistent, 'great-mortality')).toBe(true);
  expect(isCardEarned(persistent, 'black-death-name')).toBe(true);
  expect(events).toHaveLength(2);
});

test('solving question three earns the partly-true rats card', () => {
  const persistent = createPersistentState();
  expect(grantQuestionSolved(spec, persistent, 'q3', ctx)).toEqual([{ kind: 'card', id: 'rats' }]);
  expect(grantQuestionSolved(spec, persistent, 'q1', ctx)).toEqual([]);
});

test('the lens unseals the Answer chronicle, its card and the flag', () => {
  const persistent = createPersistentState();
  const events = grantLens(spec, persistent, ctx);
  expect(persistent.lensUnlocked).toBe(true);
  expect(isChronicleUnlocked(persistent, 'the-answer')).toBe(true);
  expect(isCardEarned(persistent, 'plague-extinct')).toBe(true);
  expect(events).toEqual([
    { kind: 'chronicle', id: 'the-answer' },
    { kind: 'card', id: 'plague-extinct' },
  ]);
});

test('finishing a run counts misses for the assist and grants run-end unlocks', () => {
  const persistent = createPersistentState();
  persistent.cluesFound.push('c-dead-rats');
  const run = createRun(spec, { seed: 1 });
  applyRunCompletion(spec, persistent, run, ctx);
  expect(persistent.runsCompleted).toBe(1);
  expect(persistent.assistMissCounts['c-dead-rats']).toBe(0);
  expect(persistent.assistMissCounts['c-coughing']).toBe(1);
  expect(persistent.assistMissCounts['c-ragman']).toBe(1);
  expect(persistent.chroniclesOpened).toContain('great-mortality');
});

test('assist clues surface only after three stewardships without them', () => {
  const persistent = createPersistentState();
  persistent.assistMissCounts = { 'c-dead-rats': 3, 'c-coughing': 2, 'c-ragman': 0 };
  expect(assistCluesFor(spec, persistent)).toEqual(['c-dead-rats']);
});

test('earned captions fill the month and town from card metadata', () => {
  const persistent = createPersistentState();
  persistent.cardMeta['quarantine-modern'] = { month: 1, run: 0 };
  expect(earnedCaption(spec, persistent, 'quarantine-modern')).toBe(
    'Earned in December 1347, for holding a galley forty days.',
  );
  persistent.cardMeta['ring-around'] = { month: 9, town: 'collina', run: 0 };
  expect(earnedCaption(spec, persistent, 'ring-around')).toBe(
    'Earned in August 1348, when Collina buried its last.',
  );
  expect(earnedCaption(spec, persistent, 'beaked-mask')).toBeNull();
});
