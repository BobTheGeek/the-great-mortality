import { expect, test } from 'vitest';
import { createQuizRecord, needsReviewDot, quizComplete, recordAnswer } from '../../src/app/quiz';

test('a fresh record starts empty', () => {
  const record = createQuizRecord(2);
  expect(record.answeredCount).toEqual([0, 0]);
  expect(record.firstTryCorrect).toEqual([false, false]);
  expect(record.correct).toEqual([false, false]);
  expect(quizComplete(record)).toBe(false);
  expect(needsReviewDot(record)).toBe(false);
});

test('a correct first answer marks first-try success', () => {
  const record = recordAnswer(createQuizRecord(2), 0, true);
  expect(record.answeredCount[0]).toBe(1);
  expect(record.firstTryCorrect[0]).toBe(true);
  expect(record.correct[0]).toBe(true);
  expect(needsReviewDot(record)).toBe(false);
});

test('a missed first answer raises the review dot until both are correct', () => {
  let record = createQuizRecord(2);
  record = recordAnswer(record, 0, true);
  record = recordAnswer(record, 1, false);
  expect(needsReviewDot(record)).toBe(true);
  expect(quizComplete(record)).toBe(false);
  record = recordAnswer(record, 1, true);
  expect(needsReviewDot(record)).toBe(false);
  expect(quizComplete(record)).toBe(true);
  expect(record.firstTryCorrect[1]).toBe(false);
});

test('a wrong answer keeps counting attempts but never clears first-try failure', () => {
  let record = createQuizRecord(1);
  record = recordAnswer(record, 0, false);
  record = recordAnswer(record, 0, false);
  record = recordAnswer(record, 0, true);
  expect(record.answeredCount[0]).toBe(3);
  expect(record.firstTryCorrect[0]).toBe(false);
  expect(record.correct[0]).toBe(true);
  expect(needsReviewDot(record)).toBe(false);
});
