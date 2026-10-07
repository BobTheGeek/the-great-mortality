import { expect, test } from 'vitest';
import {
  collectPlaceholders,
  collectTermRefs,
  fillPlaceholders,
  parseMarkup,
} from '../../src/spec/markup';

test('plain text parses as a single text token', () => {
  expect(parseMarkup('plain words')).toEqual([{ kind: 'text', text: 'plain words' }]);
});

test('a bare term reference parses without display text', () => {
  expect(parseMarkup('a [[steward]] b')).toEqual([
    { kind: 'text', text: 'a ' },
    { kind: 'term', termId: 'steward' },
    { kind: 'text', text: ' b' },
  ]);
});

test('a term reference with display text keeps it', () => {
  expect(parseMarkup('[[florin|florins]]')).toEqual([
    { kind: 'term', termId: 'florin', display: 'florins' },
  ]);
});

test('adjacent and trailing terms parse cleanly', () => {
  expect(parseMarkup('[[a]] [[b]]!')).toEqual([
    { kind: 'term', termId: 'a' },
    { kind: 'text', text: ' ' },
    { kind: 'term', termId: 'b' },
    { kind: 'text', text: '!' },
  ]);
});

test('collects every term reference including display-text forms', () => {
  expect(collectTermRefs('x [[a-b]] [[c|C]] and [[a-b]]')).toEqual(['a-b', 'c', 'a-b']);
});

test('collects placeholder names', () => {
  expect(collectPlaceholders('{town} in {month} of {steward}')).toEqual([
    'town',
    'month',
    'steward',
  ]);
});

test('fills known placeholders and leaves unknown ones intact', () => {
  expect(fillPlaceholders('Earned in {month}, for {x}.', { month: 'February 1348' })).toBe(
    'Earned in February 1348, for {x}.',
  );
});
