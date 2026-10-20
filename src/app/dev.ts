import { endMonth } from '../engine/engine';
import type { RunState } from '../engine/types';
import type { Spec } from '../spec/types';
import type { PersistentState } from '../shell/state';

/** Runs whole months with no decrees, stopping at the target or at a run end. */
export function skipMonths(run: RunState, targetMonth: number): number {
  const target = Math.max(run.month, Math.min(targetMonth, run.spec.sim.months));
  let skipped = 0;
  while (run.month < target && !run.ended) {
    endMonth(run);
    skipped++;
  }
  return skipped;
}

export interface UnlockSummary {
  clues: number;
  terms: number;
  chronicles: number;
  cards: number;
  epithets: number;
}

function addAll(target: string[], ids: string[]): number {
  let added = 0;
  ids.forEach((id) => {
    if (!target.includes(id)) {
      target.push(id);
      added++;
    }
  });
  return added;
}

export function unlockAll(spec: Spec, persistent: PersistentState): UnlockSummary {
  const summary: UnlockSummary = {
    clues: addAll(persistent.cluesFound, spec.mystery.clues.map((c) => c.id)),
    terms: addAll(persistent.codexSeen, spec.codex.map((c) => c.id)),
    chronicles: addAll(persistent.chroniclesOpened, spec.chronicles.map((c) => c.id)),
    cards: addAll(persistent.cardsEarned, spec.cards.map((c) => c.id)),
    epithets: addAll(persistent.epithetsEarned, spec.epithets.order),
  };
  addAll(persistent.codexRead, spec.codex.map((c) => c.id));
  addAll(persistent.chroniclesRead, spec.chronicles.map((c) => c.id));
  persistent.lensUnlocked = true;
  return summary;
}

export function unlockSummaryText(summary: UnlockSummary): string {
  const parts: string[] = [];
  if (summary.clues) parts.push(`${summary.clues} clue${summary.clues === 1 ? '' : 's'}`);
  if (summary.terms) parts.push(`${summary.terms} terms`);
  if (summary.chronicles) parts.push(`${summary.chronicles} chronicles`);
  if (summary.cards) parts.push(`${summary.cards} cards`);
  if (summary.epithets) parts.push(`${summary.epithets} epithets`);
  return parts.length ? `Unlocked ${parts.join(', ')}.` : 'Everything was already unlocked.';
}
