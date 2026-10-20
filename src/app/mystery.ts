import type { QuestionDef, Spec } from '../spec/types';
import type { PersistentState } from '../shell/state';

export interface Verdict {
  state: 'solved' | 'notYet' | 'wrong';
  summary?: string;
  hint?: string;
  clue?: { id: string; title: string; text: string };
  religious?: boolean;
  text?: string;
}

function questionOf(spec: Spec, questionId: string): QuestionDef {
  return spec.mystery.questions.find((q) => q.id === questionId)!;
}

export function clueCountFor(spec: Spec, persistent: PersistentState, questionId: string): number {
  const found = new Set(persistent.cluesFound);
  return spec.mystery.clues.filter((clue) => clue.questions.includes(questionId) && found.has(clue.id))
    .length;
}

export function ruleMet(question: QuestionDef, found: Set<string>): boolean {
  const all = question.solveRule.all ?? [];
  const anyOf = question.solveRule.anyOf ?? [];
  const need = question.solveRule.need ?? 0;
  return all.every((clue) => found.has(clue)) && anyOf.filter((clue) => found.has(clue)).length >= need;
}

export function evaluateTheory(
  spec: Spec,
  persistent: PersistentState,
  questionId: string,
  theoryId: string,
): Verdict {
  const question = questionOf(spec, questionId);
  const theory = question.theories.find((t) => t.id === theoryId)!;
  const found = new Set(persistent.cluesFound);
  if (theory.correct === true) {
    if (ruleMet(question, found)) return { state: 'solved', summary: question.solvedSummary };
    return { state: 'notYet', hint: question.notYetHint };
  }
  const clue = spec.mystery.clues.find((c) => found.has(c.id) && c.against.includes(theoryId));
  const verdict: Verdict = { state: 'wrong', religious: Boolean(theory.religious) };
  if (clue) {
    verdict.clue = { id: clue.id, title: clue.title, text: clue.text };
  } else {
    verdict.text = spec.mystery.verdicts.wrong.noClueText;
  }
  return verdict;
}

export function solveQuestion(persistent: PersistentState, questionId: string): void {
  if (!persistent.mysterySolved.includes(questionId)) persistent.mysterySolved.push(questionId);
}

export function isQuestionSolved(persistent: PersistentState, questionId: string): boolean {
  return persistent.mysterySolved.includes(questionId);
}

export function allQuestionsSolved(spec: Spec, persistent: PersistentState): boolean {
  return spec.mystery.questions.every((q) => isQuestionSolved(persistent, q.id));
}
