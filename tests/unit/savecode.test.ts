import { expect, test } from 'vitest';
import { SAVE_SCHEMA, decodeSaveCode, encodeSaveCode, type SaveDocument } from '../../src/shell/save';
import { createPersistentState } from '../../src/shell/state';

function makeDoc(): SaveDocument {
  const persistent = createPersistentState();
  persistent.codexSeen.push('steward');
  persistent.runsCompleted = 2;
  return {
    schema: SAVE_SCHEMA,
    app: 'the-great-mortality',
    specVersion: '1.0.0',
    savedAt: '2026-01-01T00:00:00.000Z',
    persistent,
    run: null,
  };
}

test('progress codes round-trip exactly', () => {
  const code = encodeSaveCode(makeDoc());
  expect(code.startsWith('TGM1.')).toBe(true);
  expect(decodeSaveCode(code)).toEqual(makeDoc());
});

test('a damaged progress code is rejected', () => {
  const code = encodeSaveCode(makeDoc());
  const damaged = `${code.slice(0, -4)}AAAA`;
  expect(() => decodeSaveCode(damaged)).toThrow();
});

test('a code with the wrong prefix is rejected', () => {
  expect(() => decodeSaveCode('OTHER.1234.abcd')).toThrow();
});

test('a code from another app is rejected', () => {
  const doc = { ...makeDoc(), app: 'other-app' };
  expect(() => decodeSaveCode(encodeSaveCode(doc))).toThrow();
});

test('a code carrying a malformed payload is rejected', () => {
  expect(() => decodeSaveCode('TGM1.deadbeef.###')).toThrow();
});
