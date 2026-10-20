import { autoplayToEnd, createRun, endMonth, issueDecree, liftDecree } from '../engine/engine';
import { serializeRun } from '../engine/serialize';
import type { RunState } from '../engine/types';
import { createPersistentState, createJournal } from '../shell/state';
import type { SaveStore } from '../shell/save';
import { deriveDecreeRow } from '../skin/decrees';
import { composeReport } from '../skin/report';
import { advisorForMonth, advisorLine, advisorOffer, applyPendingOffer } from './advisors';
import { addDecreeEntry, addReportEntries } from './journal';
import { allQuestionsSolved, evaluateTheory, solveQuestion } from './mystery';
import { namePageCount } from './opening';
import {
  applyRunCompletion,
  assistCluesFor,
  finalizeEpithet,
  grantAdvisor,
  grantClue,
  grantDecree,
  grantEvent,
  grantLens,
  grantOpening,
  grantQuestionSolved,
  grantTownBurned,
  markChronicleRead,
  markCodexRead,
  markTermsSeen,
  type UnlockEvent,
} from './progress';
import { createQuizRecord, recordAnswer } from './quiz';
import type { AppState, LensLayers, PendingStep, Screen, Store } from './store';

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

  const clearRunUi = (): Partial<AppState> => ({
    ledger: 'ledger',
    selectedTown: null,
    selectedDecree: null,
    boardQuestion: null,
    codexTerm: null,
    chronicleId: null,
    chronicleQuiz: null,
    lensOpen: false,
  });

  const beginAgain = (): void => {
    store.update({
      run: null,
      journal: createJournal(),
      screen: 'start',
      sheet: null,
      queue: [],
      pendingChronicle: null,
      advisorPeek: null,
      openingStarted: false,
      openingLine: 0,
      openingTitle: false,
      namePage: 0,
      ...clearRunUi(),
    });
    persist();
  };

  const earnedSteps = (events: UnlockEvent[]): PendingStep[] =>
    events.filter((e) => e.kind === 'card').map((e) => ({ kind: 'earned' as const, cardId: e.id }));

  const markNew = (events: UnlockEvent[]): void => {
    const run = store.get().run;
    if (!run) return;
    events.forEach((event) => {
      run.flags[`new:${event.kind}:${event.id}`] = true;
    });
  };

  /** Presents unlock moments immediately when the player is mid-month. */
  const present = (events: UnlockEvent[]): void => {
    markNew(events);
    const steps = earnedSteps(events);
    if (steps.length) {
      store.update({ queue: [...store.get().queue, ...steps] });
      advance();
    }
  };

  const finalizeOnce = (run: RunState): UnlockEvent[] => {
    if (run.flags['shell:finalized']) return [];
    run.flags['shell:finalized'] = true;
    const state = store.get();
    return applyRunCompletion(state.spec, state.persistent, run, {
      month: Math.min(run.month, state.spec.sim.months - 1),
    });
  };

  const firstUnresolvedQuestion = (): string | null => {
    const state = store.get();
    const question = state.spec.mystery.questions.find(
      (q) => !state.persistent.mysterySolved.includes(q.id),
    );
    return question?.id ?? state.spec.mystery.questions[0]?.id ?? null;
  };

  /**
   * Materializes queued moments one at a time. Sheets/screens take over until
   * closed; when the queue drains, a decree accepted from an advisor is
   * issued for the new month. `fallback` names the screen to return to once
   * everything drains (month chains come back to the map).
   */
  const advance = (fallback?: Screen): void => {
    let guard = 0;
    while (guard++ < 60) {
      const state = store.get();
      if (state.sheet) return;
      const [step, ...rest] = state.queue;
      if (!step) break;
      const spec = state.spec;
      const run = state.run;

      if (step.kind === 'earned') {
        store.update({ queue: rest, sheet: { kind: 'earned', cardId: step.cardId } });
        return;
      }
      if (step.kind === 'event') {
        store.update({ queue: rest, sheet: { kind: 'event', eventId: step.eventId } });
        return;
      }
      if (step.kind === 'advisor') {
        if (!run) {
          store.update({ queue: rest });
          continue;
        }
        const advisor = spec.advisors.find((a) => a.id === step.advisorId);
        if (!advisor) {
          store.update({ queue: rest });
          continue;
        }
        const line = advisorLine(spec, run, advisor, run.month);
        const offer = advisorOffer(spec, run, advisor);
        const events = grantAdvisor(spec, state.persistent, advisor.id, { month: run.month });
        run.flags['adv:last'] = advisor.id;
        run.flags[`advline:${advisor.id}:${line.index}`] = true;
        const termEvents = markTermsSeen(spec, state.persistent, [line.text]);
        markNew(events);
        markNew(termEvents);
        store.update({
          queue: [...earnedSteps(events), ...rest],
          sheet: { kind: 'advisor', advisorId: advisor.id, offer },
          advisorPeek: { advisorId: advisor.id, text: line.text },
        });
        persist();
        return;
      }
      if (step.kind === 'lens-reveal') {
        store.update({ queue: rest, sheet: { kind: 'lens-reveal' } });
        return;
      }
      if (step.kind === 'ending') {
        store.update({ queue: rest, screen: 'ending', sheet: null, lensOpen: false });
        persist();
        return;
      }
      if (step.kind === 'reckoning') {
        store.update({ queue: rest, screen: 'reckoning', sheet: null, lensOpen: false });
        persist();
        return;
      }
    }

    const state = store.get();
    if (state.sheet || state.queue.length) return;

    if (state.run && !state.run.ended) {
      const offer = applyPendingOffer(state.spec, state.run);
      if (offer) {
        addDecreeEntry(state.journal, state.run.month, offer.decreeId, offer.townId);
        const events = grantDecree(state.spec, state.persistent, offer.decreeId, {
          month: state.run.month,
          town: offer.townId,
        });
        markNew(events);
        const steps = earnedSteps(events);
        persist();
        if (steps.length) {
          store.update({ queue: steps });
          advance(fallback);
          return;
        }
      }
    }
    if (state.pendingChronicle) {
      markChronicleRead(state.persistent, state.pendingChronicle);
      store.update({ screen: 'chronicles', chronicleId: state.pendingChronicle, pendingChronicle: null });
      persist();
      return;
    }
    if (fallback && state.screen !== fallback) {
      store.update({ screen: fallback });
    } else {
      // Re-render even when nothing else changed (an accepted advisor decree
      // mutates the run directly; the ledger must show it).
      store.update({});
    }
    persist();
  };

  const actions: Record<string, (el: HTMLElement) => void> = {
    'open-next': () => {
      const state = store.get();
      if (state.openingTitle) return;
      const total = state.spec.opening.narration.length;
      const next = state.openingLine + 1;
      if (next >= total) {
        store.update({ openingLine: total, openingTitle: true, openingStarted: true });
      } else {
        store.update({ openingLine: next, openingStarted: true });
      }
    },

    'open-skip': () => {
      const state = store.get();
      store.update({
        openingStarted: true,
        openingLine: state.spec.opening.narration.length,
        openingTitle: true,
      });
    },

    'name-reroll': () => {
      const state = store.get();
      store.update({ namePage: (state.namePage + 1) % namePageCount(state.spec) });
    },

    'name-pick': (el) => {
      const state = store.get();
      const name = el.dataset.name ?? state.spec.opening.namePool[0] ?? 'Lorenzo';
      const seedParam = new URLSearchParams(window.location.search).get('seed');
      const seed = seedParam != null && seedParam !== '' ? Number(seedParam) : undefined;
      const run = createRun(state.spec, {
        seed: Number.isFinite(seed) ? seed : undefined,
        stewardName: name,
        assistClues: assistCluesFor(state.spec, state.persistent),
      });
      if (!state.persistent.cluesFound.includes('c-galleys')) {
        state.persistent.cluesFound.push('c-galleys');
      }
      const events = grantOpening(state.spec, state.persistent);
      if (run) {
        events.forEach((event) => {
          run.flags[`new:${event.kind}:${event.id}`] = true;
        });
      }
      store.update({
        run,
        journal: createJournal(),
        screen: 'map',
        sheet: null,
        queue: [],
        pendingChronicle: null,
        advisorPeek: null,
        openingStarted: false,
        openingLine: 0,
        openingTitle: false,
        namePage: 0,
        ...clearRunUi(),
      });
      persist();
    },

    'continue-run': () => {
      const state = store.get();
      if (!state.run) {
        store.update({ openingStarted: true, openingLine: 0, openingTitle: false });
        return;
      }
      store.update({ screen: 'map', sheet: null, ...clearRunUi() });
      advance('map');
      persist();
    },

    'new-game': () => {
      store.update({ openingStarted: true, openingLine: 0, openingTitle: false, namePage: 0, sheet: null });
    },

    nav: (el) => {
      const target = NAV_TARGETS[el.dataset.target ?? ''];
      const state = store.get();
      if (el.dataset.target === 'lens') {
        if (!state.persistent.lensUnlocked) return;
        store.update({ screen: 'map', lensOpen: true, ledger: 'ledger', selectedTown: null });
        return;
      }
      if (!target) return;
      if (target === 'map' && state.run?.ended) {
        store.update({ screen: 'reckoning', lensOpen: false });
        return;
      }
      if (target === 'board') {
        store.update({
          screen: 'board',
          boardQuestion: state.boardQuestion ?? firstUnresolvedQuestion(),
          lensOpen: false,
        });
        return;
      }
      if (target === 'chronicles') {
        const current =
          el.dataset.chronicle ?? state.chronicleId ?? state.persistent.chroniclesOpened[0] ?? null;
        if (current) markChronicleRead(state.persistent, current);
        store.update({ screen: 'chronicles', chronicleId: current, chronicleQuiz: null, lensOpen: false });
        persist();
        return;
      }
      if (target === 'codex') {
        store.update({
          screen: 'codex',
          codexTerm: state.codexTerm ?? state.persistent.codexSeen[0] ?? null,
          lensOpen: false,
        });
        return;
      }
      store.update({ screen: target, lensOpen: false });
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
      state.run.flags[`solved:${sheet.questionId}`] = true;
      let events = grantQuestionSolved(state.spec, state.persistent, sheet.questionId, {
        month: state.run.month,
      });
      const reveal = allQuestionsSolved(state.spec, state.persistent);
      if (reveal) {
        events = [...events, ...grantLens(state.spec, state.persistent, { month: state.run.month })];
      }
      markNew(events);
      const queue = reveal
        ? [...earnedSteps(events), { kind: 'lens-reveal' as const }]
        : earnedSteps(events);
      store.update({ sheet: null, queue });
      persist();
      advance();
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
      store.update({ sheet: null });
      advance();
    },

    'event-read': () => {
      const state = store.get();
      const sheet = state.sheet;
      if (sheet?.kind !== 'event') return;
      const chronicle = state.spec.chronicles.find((c) => c.unlock === `event:${sheet.eventId}`);
      store.update({ sheet: null, pendingChronicle: chronicle?.id ?? null });
      advance('map');
    },

    'advisor-thanks': () => {
      store.update({ sheet: null });
      advance();
    },

    'advisor-take': () => {
      const state = store.get();
      const sheet = state.sheet;
      const run = state.run;
      if (sheet?.kind !== 'advisor' || !sheet.offer || !run) return;
      run.flags['advoffer:id'] = sheet.offer.id;
      if (sheet.offer.townId) run.flags['advoffer:town'] = sheet.offer.townId;
      store.update({ sheet: null });
      advance();
      persist();
    },

    'lens-enter': () => {
      store.update({ sheet: null, screen: 'map', lensOpen: true, ledger: 'ledger' });
      persist();
    },

    'close-lens': () => {
      store.update({ lensOpen: false });
    },

    'lens-layer': (el) => {
      const state = store.get();
      const layer = el.dataset.layer as keyof LensLayers;
      if (!(layer in state.lensLayers)) return;
      store.update({ lensLayers: { ...state.lensLayers, [layer]: !state.lensLayers[layer] } });
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
        present(events);
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
        present(events);
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
      const run = state.run;
      if (!run) return;
      issueDecree(run, 'flee');
      const events = finalizeOnce(run);
      markNew(events);
      run.flags['shell:endMonth'] = String(run.month);
      autoplayToEnd(run);
      finalizeEpithet(state.spec, state.persistent, run);
      store.update({
        sheet: null,
        selectedDecree: null,
        selectedTown: null,
        ledger: 'ledger',
        lensOpen: false,
        queue: [...earnedSteps(events), { kind: 'ending' }],
      });
      persist();
      advance();
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

      const eventSteps: PendingStep[] = [];
      for (const raw of report.events ?? []) {
        const eventId = typeof raw === 'string' ? raw : raw.id;
        const def = state.spec.scriptedEvents?.find((e) => e.id === eventId);
        if (!def) continue;
        unlocks.push(...grantEvent(state.spec, state.persistent, def.id, { month: report.month }));
        unlocks.push(
          ...markTermsSeen(state.spec, state.persistent, [
            def.title,
            ...def.paragraphs,
            def.stewardAction,
            def.footer,
          ]),
        );
        eventSteps.push({ kind: 'event', eventId: def.id });
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
      markNew(unlocks);

      const queue: PendingStep[] = [...earnedSteps(unlocks), ...eventSteps];
      const advisor = !run.ended ? advisorForMonth(state.spec, run, report.month) : null;
      if (advisor) queue.push({ kind: 'advisor', advisorId: advisor.id });

      store.update({
        sheet: { kind: 'report', view, ended: run.ended, unlocks },
        queue,
        selectedTown: null,
        ledger: 'ledger',
        lensOpen: false,
      });
      persist();
    },

    'report-next': () => {
      const state = store.get();
      const sheet = state.sheet;
      const run = state.run;
      if (sheet?.kind !== 'report') return;
      store.update({ sheet: null });
      if (sheet.ended && run) {
        if (run.flags['shell:endMonth'] == null) {
          run.flags['shell:endMonth'] = String(Math.max(0, run.month - 1));
        }
        autoplayToEnd(run);
        finalizeEpithet(state.spec, state.persistent, run);
        const queue = [...store.get().queue];
        queue.push(sheet.ended === 'normal' ? { kind: 'reckoning' } : { kind: 'ending' });
        store.update({ queue, advisorPeek: null });
        persist();
      }
      advance('map');
    },

    'ending-reckoning': () => {
      store.update({ screen: 'reckoning' });
      persist();
    },

    'ending-again': () => {
      beginAgain();
    },

    'reckon-again': () => {
      beginAgain();
    },

    'reckon-chronicle': () => {
      const state = store.get();
      markChronicleRead(state.persistent, 'great-mortality');
      store.update({ screen: 'chronicles', chronicleId: 'great-mortality', chronicleQuiz: null });
      persist();
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
        queue: [],
        pendingChronicle: null,
        advisorPeek: null,
        openingStarted: false,
        openingLine: 0,
        openingTitle: false,
        namePage: 0,
        ...clearRunUi(),
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

  const townEligible = (run: RunState, decreeId: string, townId: string): boolean => {
    const t = run.towns[townId];
    if (!t) return false;
    if (decreeId === 'seal-roads') return !t.sealed;
    if (decreeId === 'clean-streets') return !t.clean;
    return true;
  };

  const townClick = (townId: string): void => {
    const state = store.get();
    const run = state.run;
    if (!run) return;
    if (state.lensOpen) return;
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
