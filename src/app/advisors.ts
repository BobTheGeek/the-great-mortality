import { createRng } from '../engine/rng';
import type { RunState } from '../engine/types';
import { issueDecree, liftDecree } from '../engine/engine';
import type { AdvisorDef, Spec } from '../spec/types';
import { calendarMonth } from '../skin/calendar';

const SALT_CHANCE = 0x51ab33;
const SALT_PICK = 0x7f3d91;

const INTRO_ORDER = ['merchant', 'physician', 'priest', 'astrologer'];

/**
 * Shell-side deterministic draw. Never touches the engine RNG, so the
 * simulation stays reproducible from the seed alone.
 */
export function shellRandom(seed: number, salt: number, month: number): number {
  const mixed = (seed ^ Math.imul(month + 1, 0x9e3779b9) ^ salt) >>> 0;
  return createRng(mixed).next();
}

export function advisorForMonth(spec: Spec, run: RunState, monthCompleted: number): AdvisorDef | null {
  if (monthCompleted < INTRO_ORDER.length) {
    const id = INTRO_ORDER[monthCompleted];
    return spec.advisors.find((a) => a.id === id) ?? null;
  }
  if (shellRandom(run.seed, SALT_CHANCE, monthCompleted) >= 0.4) return null;
  const last = typeof run.flags['adv:last'] === 'string' ? (run.flags['adv:last'] as string) : null;
  const others = spec.advisors.filter((a) => a.id !== last);
  if (!others.length) return null;
  const draw = shellRandom(run.seed, SALT_PICK, monthCompleted);
  const pick = Math.min(others.length - 1, Math.floor(draw * others.length));
  return others[pick]!;
}

export function anyBurials(run: RunState): boolean {
  return Object.values(run.towns).some((t) => t.D > 0);
}

export interface AdvisorLine {
  text: string;
  index: number;
}

export function advisorLine(
  spec: Spec,
  run: RunState,
  advisor: AdvisorDef,
  month: number,
): AdvisorLine {
  const cal = calendarMonth(spec.sim.startCalendarMonth, month);
  const context = [11, 0, 1].includes(cal) ? 'winter' : anyBurials(run) ? 'spreading' : 'early';
  let pool = advisor.lines[context];
  if (!pool?.length) pool = advisor.lines.early;
  if (!pool?.length) pool = Object.values(advisor.lines)[0];
  if (!pool?.length) return { text: '', index: 0 };
  let index = pool.findIndex((_, i) => !run.flags[`advline:${advisor.id}:${i}`]);
  if (index === -1) index = 0;
  return { text: pool[index]!, index };
}

export interface AdvisorOffer {
  id: string;
  kind: 'decree' | 'lift';
  decreeId: string;
  townId?: string;
  cost: number;
}

export function offerTown(spec: Spec, run: RunState): string {
  let best: { id: string; d: number } | null = null;
  for (const t of Object.values(run.towns)) {
    if (t.D > 0 && (!best || t.D > best.d)) best = { id: t.id, d: t.D };
  }
  return best?.id ?? spec.sim.portTown;
}

export function advisorOffer(spec: Spec, run: RunState, advisor: AdvisorDef): AdvisorOffer | null {
  for (const raw of advisor.offers) {
    if (raw.startsWith('lift:')) {
      const decreeId = raw.slice('lift:'.length);
      const active =
        decreeId === 'hold-ships' ? run.shipsHeld : decreeId === 'close-port' ? run.portClosed : false;
      if (active) return { id: raw, kind: 'lift', decreeId, cost: 0 };
      continue;
    }
    const decreeDef = spec.decrees.find((d) => d.id === raw);
    if (!decreeDef) continue;
    if (decreeDef.cost > run.treasury) continue;
    if (decreeDef.target === 'town') {
      const townId = offerTown(spec, run);
      const t = run.towns[townId]!;
      if (raw === 'seal-roads' && t.sealed) continue;
      if (raw === 'clean-streets' && t.clean) continue;
      return { id: raw, kind: 'decree', decreeId: raw, townId, cost: decreeDef.cost };
    }
    if (raw === 'hold-ships' && run.shipsHeld) continue;
    if (raw === 'close-port' && run.portClosed) continue;
    if (raw === 'close-bathhouses' && run.bathhousesClosed) continue;
    return { id: raw, kind: 'decree', decreeId: raw, cost: decreeDef.cost };
  }
  return null;
}

export interface AppliedOffer {
  decreeId: string;
  townId?: string;
  lifted: boolean;
}

/**
 * Applies a decree the steward accepted from an advisor, at the start of the
 * month after it was offered. Returns the issued/lifted decree, or null when
 * nothing was pending or it is no longer valid.
 */
export function applyPendingOffer(spec: Spec, run: RunState): AppliedOffer | null {
  const raw = run.flags['advoffer:id'];
  if (typeof raw !== 'string' || !raw) return null;
  const townFlag = run.flags['advoffer:town'];
  const townId = typeof townFlag === 'string' ? townFlag : undefined;
  delete run.flags['advoffer:id'];
  delete run.flags['advoffer:town'];
  if (run.ended) return null;
  if (raw.startsWith('lift:')) {
    const decreeId = raw.slice('lift:'.length);
    const active =
      decreeId === 'hold-ships' ? run.shipsHeld : decreeId === 'close-port' ? run.portClosed : false;
    if (!active) return null;
    liftDecree(run, decreeId);
    return { decreeId, townId, lifted: true };
  }
  const result = issueDecree(run, raw, townId);
  if (!result.ok) return null;
  return { decreeId: raw, townId, lifted: false };
}
