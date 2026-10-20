import type { RunEnd, RunState } from '../engine/types';
import type { Spec } from '../spec/types';
import type { PersistentState, RunJournal } from '../shell/state';
import type { ReportView } from '../skin/report';
import type { AdvisorOffer } from './advisors';
import type { Verdict } from './mystery';
import type { UnlockEvent } from './progress';

export type Screen = 'start' | 'map' | 'board' | 'codex' | 'chronicles' | 'cards' | 'ending' | 'reckoning';

export type PendingStep =
  | { kind: 'earned'; cardId: string }
  | { kind: 'event'; eventId: string }
  | { kind: 'advisor'; advisorId: string }
  | { kind: 'lens-reveal' }
  | { kind: 'ending' }
  | { kind: 'reckoning' };

export interface AdvisorPeek {
  advisorId: string;
  text: string;
}

export type SheetState =
  | { kind: 'confirm-issue'; decreeId: string; townId: string }
  | { kind: 'confirm-flee'; armed: boolean }
  | { kind: 'report'; view: ReportView; ended: RunEnd; unlocks: UnlockEvent[] }
  | { kind: 'paused'; resetArmed: boolean }
  | { kind: 'verdict'; questionId: string; theoryId: string; verdict: Verdict }
  | { kind: 'earned'; cardId: string }
  | { kind: 'event'; eventId: string }
  | { kind: 'advisor'; advisorId: string; offer: AdvisorOffer | null }
  | { kind: 'lens-reveal' }
  | { kind: 'dev' }
  | { kind: 'codex-term'; termId: string; x: number; y: number };

export interface LensLayers {
  rats: boolean;
  fleas: boolean;
  forms: boolean;
}

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
  queue: PendingStep[];
  pendingChronicle: string | null;
  advisorPeek: AdvisorPeek | null;
  openingStarted: boolean;
  openingLine: number;
  openingTitle: boolean;
  namePage: number;
  lensOpen: boolean;
  lensLayers: LensLayers;
  a2hsExpanded: boolean;
  a2hsWarn: boolean;
  codeText: string | null;
  codeStatus: string | null;
  restoreOpen: boolean;
  devTaps: number[];
  devSeed: number | null;
  devNote: string | null;
  devHarness: { name: string; avg: number; overthrown: number; spared: number }[] | null;
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
