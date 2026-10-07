import type { Spec } from '../spec/types';
import { createRun } from './engine';
import type { Counters, PendingClue, RunEnd, RunState, TownState } from './types';

export const RUN_SERIALIZATION_VERSION = 1;

export interface SerializedTown extends TownState {}

export interface SerializedRun {
  v: number;
  seed: number;
  rngState: number;
  steward: string;
  month: number;
  treasury: number;
  unrest: number;
  decreesLeft: number;
  shipsHeld: boolean;
  portClosed: boolean;
  bathhousesClosed: boolean;
  towns: Record<string, SerializedTown>;
  ended: RunEnd;
  maxUnrest: number;
  counters: Counters;
  assist: string[];
  pending: PendingClue[];
  flags: Record<string, boolean>;
  startTreasury: number;
}

function cloneTown(t: SerializedTown): SerializedTown {
  return {
    ...t,
    decreesHistory: t.decreesHistory.map((d) => ({ ...d })),
    monthlyDeaths: [...t.monthlyDeaths],
    monthlyCases: [...t.monthlyCases],
  };
}

export function serializeRun(s: RunState): SerializedRun {
  const towns: Record<string, SerializedTown> = {};
  for (const [id, t] of Object.entries(s.towns)) {
    towns[id] = cloneTown(t);
  }
  return {
    v: RUN_SERIALIZATION_VERSION,
    seed: s.seed,
    rngState: s.rng.state,
    steward: s.steward,
    month: s.month,
    treasury: s.treasury,
    unrest: s.unrest,
    decreesLeft: s.decreesLeft,
    shipsHeld: s.shipsHeld,
    portClosed: s.portClosed,
    bathhousesClosed: s.bathhousesClosed,
    towns,
    ended: s.ended,
    maxUnrest: s.maxUnrest,
    counters: { ...s.counters },
    assist: [...s.assist],
    pending: s.pending.map((p) => ({ ...p })),
    flags: { ...s.flags },
    startTreasury: s.startTreasury,
  };
}

export function hydrateRun(spec: Spec, saved: SerializedRun): RunState {
  if (saved.v !== RUN_SERIALIZATION_VERSION) {
    throw new Error(`Unsupported save version: ${saved.v}`);
  }
  const s = createRun(spec, {
    seed: saved.seed,
    stewardName: saved.steward,
    assistClues: saved.assist,
  });
  s.rng.state = saved.rngState;
  s.month = saved.month;
  s.treasury = saved.treasury;
  s.unrest = saved.unrest;
  s.decreesLeft = saved.decreesLeft;
  s.shipsHeld = saved.shipsHeld;
  s.portClosed = saved.portClosed;
  s.bathhousesClosed = saved.bathhousesClosed;
  for (const [id, t] of Object.entries(saved.towns)) {
    if (!s.towns[id]) continue;
    s.towns[id] = cloneTown(t);
  }
  s.ended = saved.ended;
  s.maxUnrest = saved.maxUnrest;
  s.counters = { ...saved.counters };
  s.assist = new Set(saved.assist);
  s.pending = saved.pending.map((p) => ({ ...p }));
  s.flags = { ...saved.flags };
  s.startTreasury = saved.startTreasury;
  return s;
}
