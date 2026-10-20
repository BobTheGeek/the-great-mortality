import type { QuizRecord } from '../shell/state';

export function createQuizRecord(questionCount: number): QuizRecord {
  return {
    answeredCount: Array.from({ length: questionCount }, () => 0),
    firstTryCorrect: Array.from({ length: questionCount }, () => false),
    correct: Array.from({ length: questionCount }, () => false),
  };
}

export function recordAnswer(record: QuizRecord, index: number, correct: boolean): QuizRecord {
  const next: QuizRecord = {
    answeredCount: [...record.answeredCount],
    firstTryCorrect: [...record.firstTryCorrect],
    correct: [...record.correct],
  };
  next.answeredCount[index] = (next.answeredCount[index] ?? 0) + 1;
  if (next.answeredCount[index] === 1) next.firstTryCorrect[index] = correct;
  next.correct[index] = Boolean(next.correct[index]) || correct;
  return next;
}

export function quizComplete(record: QuizRecord): boolean {
  return record.correct.length > 0 && record.correct.every(Boolean);
}

export function needsReviewDot(record: QuizRecord): boolean {
  const missedFirstTry = record.answeredCount.some(
    (count, index) => count > 0 && !record.firstTryCorrect[index],
  );
  return missedFirstTry && !quizComplete(record);
}
