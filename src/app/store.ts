import type { RunEnd, RunState } from '../engine/types';
import type { Spec } from '../spec/types';
import type { PersistentState, RunJournal } from '../shell/state';
import type { ReportView } from '../skin/report';
import type { Verdict } from './mystery';
import type { UnlockEvent } from './progress';

export type Screen = 'start' | 'map' | 'board' | 'codex' | 'chronicles' | 'cards';

export type SheetState =
  | { kind: 'confirm-issue'; decreeId: string; townId: string }
  | { kind: 'confirm-flee'; armed: boolean }
  | { kind: 'report'; view: ReportView; ended: RunEnd; unlocks: UnlockEvent[] }
  | { kind: 'paused'; resetArmed: boolean }
  | { kind: 'end-stub'; ended: RunEnd }
  | { kind: 'verdict'; questionId: string; theoryId: string; verdict: Verdict }
  | { kind: 'earned'; cardId: string; finish: 'none' | 'begin-again' | 'end-stub'; ended: RunEnd }
  | { kind: 'codex-term'; termId: string; x: number; y: number };

export interface AppState {
  spec: Spec;
  persistent: PersistentState;
  run: RunState | null;
  journal: RunJournal;
  screen: Screen;
  ledger: 'ledger' | 'town';
  selectedTown: string | null;
  selectedDecree: string | null;
  sheet: SheetState | null;
  boardQuestion: string | null;
  codexTerm: string | null;
  chronicleId: string | null;
  chronicleQuiz: { open: boolean; picked: number | null; forIndex: number | null } | null;
  earnedQueue: string[];
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
