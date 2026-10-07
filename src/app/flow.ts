import { createRun, endMonth, issueDecree, liftDecree } from '../engine/engine';
import { serializeRun } from '../engine/serialize';
import type { RunState } from '../engine/types';
import { collectTermRefs } from '../spec/markup';
import type { SaveStore } from '../shell/save';
import { createJournal, createPersistentState } from '../shell/state';
import { deriveDecreeRow } from '../skin/decrees';
import { composeReport } from '../skin/report';
import { addDecreeEntry, addReportEntries } from './journal';
import type { Store } from './store';

export interface Flow {
  actions: Record<string, (el: HTMLElement) => void>;
  townClick(townId: string): void;
  markSeen(texts: string[]): void;
}

function lastSealMonth(run: RunState, townId: string): number {
  const entries = run.towns[townId]!.decreesHistory.filter((e) => e.id === 'seal-roads');
  return entries.length ? entries[entries.length - 1]!.month : -1;
}

export function createFlow(deps: { store: Store; saves: SaveStore }): Flow {
  const { store, saves } = deps;

  const persist = (): void => {
    const state = store.get();
    void saves.save(state.persistent, state.run ? serializeRun(state.run) : null, state.journal);
  };

  const beginAgain = (): void => {
    const state = store.get();
    state.persistent.runsCompleted += 1;
    store.update({
      run: null,
      journal: createJournal(),
      screen: 'start',
      sheet: null,
      ledger: 'ledger',
      selectedTown: null,
      selectedDecree: null,
    });
    persist();
  };

  function townEligible(run: RunState, decreeId: string, townId: string): boolean {
    const t = run.towns[townId];
    if (!t) return false;
    if (decreeId === 'seal-roads') return !t.sealed;
    if (decreeId === 'clean-streets') return !t.clean;
    return true;
  }

  const actions: Record<string, (el: HTMLElement) => void> = {
    'start-run': () => {
      const state = store.get();
      const run = createRun(state.spec, {});
      store.update({
        run,
        journal: createJournal(),
        screen: 'map',
        ledger: 'ledger',
        selectedTown: null,
        selectedDecree: null,
        sheet: null,
      });
      persist();
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
        store.update({});
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
      store.update({
        sheet: { kind: 'end-stub', ended: 'fled' },
        selectedDecree: null,
        selectedTown: null,
        ledger: 'ledger',
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
      for (const clue of report.clues) {
        if (!state.persistent.cluesFound.includes(clue.id)) {
          state.persistent.cluesFound.push(clue.id);
        }
      }
      const view = composeReport(state.spec, report, { previouslyFound });
      store.update({
        sheet: { kind: 'report', view, ended: run.ended },
        selectedTown: null,
        ledger: 'ledger',
      });
      persist();
    },

    'report-next': () => {
      const state = store.get();
      if (state.sheet?.kind === 'report' && state.sheet.ended) {
        beginAgain();
        return;
      }
      store.update({ sheet: null });
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
    const codexIds = new Set(state.spec.codex.map((c) => c.id));
    let changed = false;
    for (const text of texts) {
      for (const ref of collectTermRefs(text)) {
        if (codexIds.has(ref) && !state.persistent.codexSeen.includes(ref)) {
          state.persistent.codexSeen.push(ref);
          changed = true;
        }
      }
    }
    if (changed) persist();
  };

  return { actions, townClick, markSeen };
}
