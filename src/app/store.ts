import type { RunEnd, RunState } from '../engine/types';
import type { Spec } from '../spec/types';
import type { PersistentState, RunJournal } from '../shell/state';
import type { ReportView } from '../skin/report';

export type SheetState =
  | { kind: 'confirm-issue'; decreeId: string; townId: string }
  | { kind: 'confirm-flee'; armed: boolean }
  | { kind: 'report'; view: ReportView; ended: RunEnd }
  | { kind: 'paused'; resetArmed: boolean }
  | { kind: 'end-stub'; ended: RunEnd };

export interface AppState {
  spec: Spec;
  persistent: PersistentState;
  run: RunState | null;
  journal: RunJournal;
  screen: 'start' | 'map';
  ledger: 'ledger' | 'town';
  selectedTown: string | null;
  selectedDecree: string | null;
  sheet: SheetState | null;
}

export interface Store {
  get(): AppState;
  update(patch: Partial<AppState>): void;
  subscribe(listener: () => void): () => void;
}

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    update(patch) {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
