import { expect, test } from 'vitest';
import { deriveTownState, stateWord, townStatusText } from '../../src/skin/town-state';

const base = {
  pop: 1000,
  I: 0,
  P: 0,
  D: 0,
  deadRatsSeen: false,
};

test('a town with no signs is healthy', () => {
  expect(deriveTownState(base)).toBe('healthy');
  expect(stateWord('healthy')).toBe('Healthy');
});

test('a rat die-off with no human cases reads as rumors', () => {
  expect(deriveTownState({ ...base, deadRatsSeen: true })).toBe('rumors');
});

test('any present cases read as spreading', () => {
  expect(deriveTownState({ ...base, I: 5 })).toBe('spreading');
  expect(deriveTownState({ ...base, P: 0.7 })).toBe('spreading');
});

test('a town with burials under fifteen percent is still spreading', () => {
  expect(deriveTownState({ ...base, D: 50 })).toBe('spreading');
});

test('burials above fifteen percent read as ravaged', () => {
  expect(deriveTownState({ ...base, D: 151 })).toBe('ravaged');
});

test('burials at half the population read as burned out', () => {
  expect(deriveTownState({ ...base, D: 500 })).toBe('burned');
  expect(stateWord('burned')).toBe('Burned out');
});

test('burned out outranks every lesser sign', () => {
  expect(deriveTownState({ ...base, D: 600, I: 20, deadRatsSeen: true })).toBe('burned');
});

test('ravaged outranks spreading when both apply', () => {
  expect(deriveTownState({ ...base, D: 200, I: 10 })).toBe('ravaged');
});

test('status text is label, population and state word', () => {
  expect(townStatusText('Port', 12000, 'healthy')).toBe('PORT · 12,000 · Healthy');
  expect(townStatusText('Hill village', 600, 'rumors')).toBe('HILL VILLAGE · 600 · Rumors');
});
