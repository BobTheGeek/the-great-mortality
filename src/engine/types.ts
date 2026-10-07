import type { Spec } from '../spec/types';
import type { Rng } from './rng';

export interface TownState {
  id: string;
  type: string;
  pop: number;
  S: number;
  I: number;
  P: number;
  D: number;
  R: number;
  ratS: number;
  ratI: number;
  ratDeadTotal: number;
  firstHumanCase: number | null;
  deadRatsSeen: boolean;
  clean: boolean;
  sealed: boolean;
  procession: boolean;
  decreesHistory: { month: number; id: string }[];
  monthlyDeaths: number[];
  monthlyCases: number[];
}

export interface Counters {
  portClosedMonths: number;
  shipsHeldMonths: number;
  processions: number;
  physicians: number;
  herbs: number;
  cleans: number;
  sealMonths: number;
  effectiveDecrees: number;
}

export type RunEnd = null | 'normal' | 'overthrown' | 'fled';

export interface PendingClue {
  clue: string;
  town?: string;
  month: number;
  casesBefore?: number;
}

export interface RunState {
  spec: Spec;
  seed: number;
  rng: Rng;
  steward: string;
  month: number;
  treasury: number;
  unrest: number;
  decreesLeft: number;
  shipsHeld: boolean;
  portClosed: boolean;
  bathhousesClosed: boolean;
  towns: Record<string, TownState>;
  ended: RunEnd;
  maxUnrest: number;
  counters: Counters;
  assist: Set<string>;
  pending: PendingClue[];
  flags: Record<string, boolean>;
  startTreasury: number;
}

export interface CreateRunOptions {
  seed?: number;
  stewardName?: string;
  assistClues?: string[];
}

export interface ClueFinding {
  id: string;
  town?: string;
}

export type ReportEvent = string | { id: string; from?: string; to?: string };

export interface MonthReport {
  month: number;
  events: ReportEvent[];
  clues: ClueFinding[];
  deathsByTown: Record<string, number>;
  casesByTown: Record<string, number>;
  income?: number;
  unrestDelta?: number;
  deaths?: number;
  ended?: RunEnd;
}

export interface DecreeResult {
  ok: boolean;
  reason?: string;
  ended?: RunEnd;
  unlocks?: string[];
}
