import { createRun, endMonth, issueDecree, liftDecree } from '../engine/engine';
import { serializeRun } from '../engine/serialize';
import type { RunEnd, RunState } from '../engine/types';
import { collectTermRefs } from '../spec/markup';
import type { SaveStore } from '../shell/save';
import { createJournal, createPersistentState } from '../shell/state';
import { deriveDecreeRow } from '../skin/decrees';
import { composeReport } from '../skin/report';
import { addDecreeEntry, addReportEntries } from './journal';
import { allQuestionsSolved, evaluateTheory, solveQuestion } from './mystery';
import {
  applyRunCompletion,
  assistCluesFor,
  grantClue,
  grantDecree,
  grantLens,
  grantOpening,
  grantQuestionSolved,
  grantTownBurned,
  markChronicleRead,
  markCodexRead,
  markTermsSeen,
  type UnlockEvent,
} from './progress';
import { createQuizRecord, quizComplete, recordAnswer } from './quiz';
import type { Screen, Store } from './store';

export interface Flow {
  actions: Record<string, (el: HTMLElement) => void>;
  townClick(townId: string): void;
  markSeen(texts: string[]): void;
}

function lastSealMonth(run: RunState, townId: string): number {
  const entries = run.towns[townId]!.decreesHistory.filter((e) => e.id === 'seal-roads');
  return entries.length ? entries[entries.length - 1]!.month : -1;
}

const NAV_TARGETS: Record<string, Screen> = {
  map: 'map',
  evidence: 'board',
  board: 'board',
  codex: 'codex',
  chronicles: 'chronicles',
  cards: 'cards',
};

export function createFlow(deps: { store: Store; saves: SaveStore }): Flow {
  const { store, saves } = deps;

  const persist = (): void => {
    const state = store.get();
    void saves.save(state.persistent, state.run ? serializeRun(state.run) : null, state.journal);
  };

  const beginAgain = (): void => {
    store.update({
      run: null,
      journal: createJournal(),
      screen: 'start',
      sheet: null,
      ledger: 'ledger',
      selectedTown: null,
      selectedDecree: null,
      boardQuestion: null,
      codexTerm: null,
      chronicleId: null,
      chronicleQuiz: null,
      earnedQueue: [],
    });
    persist();
  };

  const finalizeOnce = (run: RunState): UnlockEvent[] => {
    if (run.flags['shell:finalized']) return [];
    run.flags['shell:finalized'] = true;
    const state = store.get();
    return applyRunCompletion(state.spec, state.persistent, run, {
      month: Math.min(run.month, state.spec.sim.months - 1),
    });
  };

  const openNextEarned = (
    finish: 'none' | 'begin-again' | 'end-stub',
    ended: RunEnd,
  ): boolean => {
    const state = store.get();
    if (state.sheet || state.earnedQueue.length === 0) return false;
    const [cardId, ...rest] = state.earnedQueue;
    store.update({
      earnedQueue: rest,
      sheet: { kind: 'earned', cardId: cardId!, finish, ended },
    });
    return true;
  };

  const showEarnedOr = (
    events: UnlockEvent[],
    finish: 'none' | 'begin-again' | 'end-stub',
    ended: RunEnd,
    fallback: () => void,
  ): void => {
    const cards = events.filter((e) => e.kind === 'card').map((e) => e.id);
    if (cards.length) {
      store.update({ earnedQueue: [...store.get().earnedQueue, ...cards] });
    }
    if (!openNextEarned(finish, ended)) fallback();
  };

  const townEligible = (run: RunState, decreeId: string, townId: string): boolean => {
    const t = run.towns[townId];
    if (!t) return false;
    if (decreeId === 'seal-roads') return !t.sealed;
    if (decreeId === 'clean-streets') return !t.clean;
    return true;
  };

  const firstUnresolvedQuestion = (): string | null => {
    const state = store.get();
    const question = state.spec.mystery.questions.find(
      (q) => !state.persistent.mysterySolved.includes(q.id),
    );
    return question?.id ?? state.spec.mystery.questions[0]?.id ?? null;
  };

  const actions: Record<string, (el: HTMLElement) => void> = {
    'start-run': () => {
      const state = store.get();
      const seedParam = new URLSearchParams(window.location.search).get('seed');
      const seed = seedParam != null && seedParam !== '' ? Number(seedParam) : undefined;
      const run = createRun(state.spec, {
        seed: Number.isFinite(seed) ? seed : undefined,
        assistClues: assistCluesFor(state.spec, state.persistent),
      });
      if (!state.persistent.cluesFound.includes('c-galleys')) {
        state.persistent.cluesFound.push('c-galleys');
      }
      grantOpening(state.spec, state.persistent);
      store.update({
        run,
        journal: createJournal(),
        screen: 'map',
        ledger: 'ledger',
        selectedTown: null,
        selectedDecree: null,
        sheet: null,
        boardQuestion: null,
        codexTerm: null,
        chronicleId: null,
        chronicleQuiz: null,
        earnedQueue: [],
      });
      persist();
    },

    nav: (el) => {
      const target = NAV_TARGETS[el.dataset.target ?? ''];
      if (!target) return;
      const state = store.get();
      if (target === 'board') {
        store.update({ screen: 'board', boardQuestion: state.boardQuestion ?? firstUnresolvedQuestion() });
        return;
      }
      if (target === 'chronicles') {
        const current =
          el.dataset.chronicle ?? state.chronicleId ?? state.persistent.chroniclesOpened[0] ?? null;
        if (current) markChronicleRead(state.persistent, current);
        store.update({ screen: 'chronicles', chronicleId: current, chronicleQuiz: null });
        persist();
        return;
      }
      if (target === 'codex') {
        store.update({
          screen: 'codex',
          codexTerm: state.codexTerm ?? state.persistent.codexSeen[0] ?? null,
        });
        return;
      }
      store.update({ screen: target });
    },

    'board-question': (el) => {
      store.update({ boardQuestion: el.dataset.id ?? null });
    },

    'verdict-argue': (el) => {
      const state = store.get();
      const questionId = el.dataset.question ?? '';
      const theoryId = el.dataset.id ?? '';
      const verdict = evaluateTheory(state.spec, state.persistent, questionId, theoryId);
      store.update({ sheet: { kind: 'verdict', questionId, theoryId, verdict } });
    },

    'verdict-pin': () => {
      const state = store.get();
      const sheet = state.sheet;
      if (sheet?.kind !== 'verdict' || !state.run) return;
      solveQuestion(state.persistent, sheet.questionId);
      let events = grantQuestionSolved(state.spec, state.persistent, sheet.questionId, {
        month: state.run.month,
      });
      if (allQuestionsSolved(state.spec, state.persistent)) {
        events = [...events, ...grantLens(state.spec, state.persistent, { month: state.run.month })];
      }
      store.update({ sheet: null });
      showEarnedOr(events, 'none', null, () => undefined);
      persist();
    },

    'verdict-close': () => {
      store.update({ sheet: null });
    },

    term: (el) => {
      const termId = el.dataset.term ?? '';
      const state = store.get();
      if (!state.spec.codex.some((c) => c.id === termId)) return;
      document.querySelectorAll('.term-lit').forEach((node) => node.classList.remove('term-lit'));
      el.classList.add('term-lit');
      if (!state.persistent.codexSeen.includes(termId)) state.persistent.codexSeen.push(termId);
      const rect = el.getBoundingClientRect();
      store.update({
        sheet: { kind: 'codex-term', termId, x: rect.left + rect.width / 2, y: rect.bottom },
      });
      markCodexRead(state.persistent, termId);
      persist();
    },

    'popover-close': () => {
      document.querySelectorAll('.term-lit').forEach((node) => node.classList.remove('term-lit'));
      store.update({ sheet: null });
    },

    'open-codex': () => {
      const state = store.get();
      if (state.sheet?.kind !== 'codex-term') return;
      store.update({ screen: 'codex', codexTerm: state.sheet.termId, sheet: null });
    },

    'codex-select': (el) => {
      const state = store.get();
      const id = el.dataset.id ?? '';
      markCodexRead(state.persistent, id);
      store.update({ codexTerm: id });
      persist();
    },

    'chronicle-select': (el) => {
      const state = store.get();
      const id = el.dataset.id ?? '';
      if (!state.persistent.chroniclesOpened.includes(id)) return;
      markChronicleRead(state.persistent, id);
      store.update({ chronicleId: id, chronicleQuiz: null });
      persist();
    },

    'chronicle-next': () => {
      const state = store.get();
      const opened = state.persistent.chroniclesOpened;
      if (!opened.length) return;
      const index = state.chronicleId ? opened.indexOf(state.chronicleId) : -1;
      const next = opened[(index + 1) % opened.length]!;
      markChronicleRead(state.persistent, next);
      store.update({ chronicleId: next, chronicleQuiz: null });
      persist();
    },

    'chronicle-quiz': () => {
      store.update({ chronicleQuiz: { open: true, picked: null, forIndex: null } });
    },

    'quiz-answer': (el) => {
      const state = store.get();
      const chronicle = state.spec.chronicles.find((c) => c.id === state.chronicleId);
      if (!chronicle || !state.chronicleQuiz?.open) return;
      const record = state.persistent.quiz[chronicle.id] ?? createQuizRecord(chronicle.quiz.length);
      const index = record.correct.findIndex((done) => !done);
      if (index === -1) return;
      const chosen = Number(el.dataset.index);
      const correct = chosen === chronicle.quiz[index]!.answer;
      state.persistent.quiz[chronicle.id] = recordAnswer(record, index, correct);
      store.update({ chronicleQuiz: { open: true, picked: chosen, forIndex: index } });
      persist();
    },

    'quiz-continue': () => {
      store.update({ chronicleQuiz: { open: true, picked: null, forIndex: null } });
    },

    'quiz-close': () => {
      store.update({ chronicleQuiz: null });
    },

    'card-flip': (el) => {
      const card = el.closest('.card');
      if (!card) return;
      card.classList.toggle('flipped');
      const id = (card as HTMLElement).dataset.id ?? '';
      const state = store.get();
      if (id) {
        if (!state.persistent.cardsFlipped.includes(id)) state.persistent.cardsFlipped.push(id);
        persist();
      }
    },

    'earned-flip': (el) => {
      const card = el.closest('.earned-card');
      if (!card) return;
      card.classList.toggle('flipped');
      const id = (card as HTMLElement).dataset.id ?? '';
      const state = store.get();
      if (id) {
        if (!state.persistent.cardsFlipped.includes(id)) state.persistent.cardsFlipped.push(id);
        persist();
      }
    },

    'earned-keep': () => {
      const state = store.get();
      const sheet = state.sheet;
      if (sheet?.kind !== 'earned') return;
      store.update({ sheet: null });
      if (!openNextEarned(sheet.finish, sheet.ended)) {
        if (sheet.finish === 'begin-again') beginAgain();
        else if (sheet.finish === 'end-stub') {
          store.update({ sheet: { kind: 'end-stub', ended: sheet.ended } });
        }
      }
    },

    decree: (el) => {
      const state = store.get();
      const run = state.run;
      if (!run) return;
      const id = el.dataset.id ?? '';
      const row = deriveDecreeRow(state.spec, run, id, state.selectedDecree, state.selectedTown !== null);

      if (row.kind === 'ends-run') {
        store.update({ sheet: { kind: 'confirm-flee', armed: false } });
        return;
      }

      if (row.state === 'active') {
        if (id === 'seal-roads') {
          const sealed = Object.values(run.towns)
            .filter((t) => t.sealed)
            .sort((a, b) => lastSealMonth(run, b.id) - lastSealMonth(run, a.id));
          const most = sealed[0];
          if (most) liftDecree(run, 'seal-roads', most.id);
        } else {
          liftDecree(run, id);
        }
        store.update({});
        persist();
        return;
      }

      if (row.state === 'unaffordable') return;

      if (row.target === 'town') {
        const knownTown = state.selectedTown;
        if (knownTown && townEligible(run, id, knownTown)) {
          store.update({ sheet: { kind: 'confirm-issue', decreeId: id, townId: knownTown } });
          return;
        }
        if (state.selectedDecree === id) {
          store.update({ selectedDecree: null });
          return;
        }
        store.update({ selectedDecree: id });
        return;
      }

      const result = issueDecree(run, id);
      if (result.ok) {
        addDecreeEntry(state.journal, run.month, id);
        const events = grantDecree(state.spec, state.persistent, id, { month: run.month });
        store.update({});
        showEarnedOr(events, 'none', null, () => undefined);
        persist();
      }
    },

    'confirm-issue': () => {
      const state = store.get();
      const sheet = state.sheet;
      const run = state.run;
      if (!run || sheet?.kind !== 'confirm-issue') return;
      const result = issueDecree(run, sheet.decreeId, sheet.townId);
      if (result.ok) {
        addDecreeEntry(state.journal, run.month, sheet.decreeId, sheet.townId);
      }
      store.update({ sheet: null, selectedDecree: null, selectedTown: null, ledger: 'ledger' });
      if (result.ok) {
        const events = grantDecree(state.spec, state.persistent, sheet.decreeId, {
          month: run.month,
          town: sheet.townId,
        });
        showEarnedOr(events, 'none', null, () => undefined);
      }
      persist();
    },

    'confirm-cancel': () => {
      store.update({ sheet: null, selectedDecree: null });
    },

    'flee-arm': () => {
      store.update({ sheet: { kind: 'confirm-flee', armed: true } });
    },

    'flee-confirm': () => {
      const state = store.get();
      if (!state.run) return;
      issueDecree(state.run, 'flee');
      const events = finalizeOnce(state.run);
      store.update({
        sheet: null,
        selectedDecree: null,
        selectedTown: null,
        ledger: 'ledger',
      });
      showEarnedOr(events, 'end-stub', 'fled', () => {
        store.update({ sheet: { kind: 'end-stub', ended: 'fled' } });
      });
      persist();
    },

    'end-month': () => {
      const state = store.get();
      const run = state.run;
      if (!run || state.selectedDecree) return;
      const previouslyFound = new Set(state.persistent.cluesFound);
      const report = endMonth(run);
      addReportEntries(state.spec, state.journal, report);

      const unlocks: UnlockEvent[] = [];
      for (const clue of report.clues) {
        if (!state.persistent.cluesFound.includes(clue.id)) {
          state.persistent.cluesFound.push(clue.id);
        }
        unlocks.push(
          ...grantClue(state.spec, state.persistent, clue.id, {
            month: report.month,
            town: clue.town,
          }),
        );
      }

      const view = composeReport(state.spec, report, { previouslyFound });
      unlocks.push(
        ...markTermsSeen(state.spec, state.persistent, [
          ...view.written,
          view.footer,
          ...view.newClues.map((clue) => clue.text),
        ]),
      );
      unlocks.push(
        ...grantTownBurned(state.spec, state.persistent, run, { month: report.month }),
      );
      if (run.ended) unlocks.push(...finalizeOnce(run));

      const cards = unlocks.filter((e) => e.kind === 'card').map((e) => e.id);
      if (cards.length) {
        store.update({ earnedQueue: [...store.get().earnedQueue, ...cards] });
      }
      store.update({
        sheet: { kind: 'report', view, ended: run.ended, unlocks },
        selectedTown: null,
        ledger: 'ledger',
      });
      persist();
    },

    'report-next': () => {
      const state = store.get();
      const sheet = state.sheet;
      if (sheet?.kind !== 'report') return;
      store.update({ sheet: null });
      const finish = sheet.ended ? 'begin-again' : 'none';
      if (!openNextEarned(finish, sheet.ended) && sheet.ended) beginAgain();
    },

    'end-begin-again': () => {
      beginAgain();
    },

    pause: () => {
      store.update({ sheet: { kind: 'paused', resetArmed: false } });
    },

    'paused-close': () => {
      store.update({ sheet: null });
    },

    'reset-progress': () => {
      store.update({ sheet: { kind: 'paused', resetArmed: true } });
    },

    'reset-cancel': () => {
      store.update({ sheet: { kind: 'paused', resetArmed: false } });
    },

    'reset-confirm': () => {
      store.update({
        persistent: createPersistentState(),
        run: null,
        journal: createJournal(),
        screen: 'start',
        sheet: null,
        ledger: 'ledger',
        selectedTown: null,
        selectedDecree: null,
        boardQuestion: null,
        codexTerm: null,
        chronicleId: null,
        chronicleQuiz: null,
        earnedQueue: [],
      });
      persist();
    },

    'back-to-ledger': () => {
      store.update({ ledger: 'ledger', selectedTown: null });
    },

    'issue-here': () => {
      store.update({ ledger: 'ledger' });
    },
  };

  const townClick = (townId: string): void => {
    const state = store.get();
    const run = state.run;
    if (!run) return;
    if (state.selectedDecree) {
      if (!townEligible(run, state.selectedDecree, townId)) return;
      store.update({ sheet: { kind: 'confirm-issue', decreeId: state.selectedDecree, townId } });
      return;
    }
    store.update({ ledger: 'town', selectedTown: townId });
  };

  const markSeen = (texts: string[]): void => {
    const state = store.get();
    const events = markTermsSeen(state.spec, state.persistent, texts);
    if (events.length) persist();
  };

  return { actions, townClick, markSeen };
}
