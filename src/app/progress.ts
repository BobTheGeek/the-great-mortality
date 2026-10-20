import type { RunState } from '../engine/types';
import { collectTermRefs, fillPlaceholders } from '../spec/markup';
import type { Spec } from '../spec/types';
import { calendarMonth, calendarYear, monthName, startYearFromSpec } from '../skin/calendar';
import type { PersistentState } from '../shell/state';

export interface UnlockEvent {
  kind: 'codex' | 'chronicle' | 'card';
  id: string;
}

export interface GrantContext {
  month: number;
  town?: string;
}

export function isChronicleUnlocked(persistent: PersistentState, chronicleId: string): boolean {
  return persistent.chroniclesOpened.includes(chronicleId);
}

export function isCardEarned(persistent: PersistentState, cardId: string): boolean {
  return persistent.cardsEarned.includes(cardId);
}

export function markTermsSeen(
  spec: Spec,
  persistent: PersistentState,
  texts: string[],
): UnlockEvent[] {
  const events: UnlockEvent[] = [];
  const codexIds = new Set(spec.codex.map((c) => c.id));
  for (const text of texts) {
    for (const ref of collectTermRefs(text)) {
      if (codexIds.has(ref) && !persistent.codexSeen.includes(ref)) {
        persistent.codexSeen.push(ref);
        events.push({ kind: 'codex', id: ref });
      }
    }
  }
  return events;
}

export function grantOpening(spec: Spec, persistent: PersistentState): UnlockEvent[] {
  const events: UnlockEvent[] = [];
  spec.chronicles
    .filter((c) => c.unlock === 'opening')
    .forEach((c) => openChronicle(spec, persistent, c.id, events));
  return events;
}

function openChronicle(
  spec: Spec,
  persistent: PersistentState,
  chronicleId: string,
  events: UnlockEvent[],
): void {
  const chronicle = spec.chronicles.find((c) => c.id === chronicleId);
  if (chronicle && !persistent.chroniclesOpened.includes(chronicleId)) {
    persistent.chroniclesOpened.push(chronicleId);
    events.push({ kind: 'chronicle', id: chronicleId });
  }
}

function earnCard(
  spec: Spec,
  persistent: PersistentState,
  cardId: string,
  ctx: GrantContext,
  events: UnlockEvent[],
  townOverride?: string,
): void {
  const card = spec.cards.find((c) => c.id === cardId);
  if (card && !persistent.cardsEarned.includes(cardId)) {
    persistent.cardsEarned.push(cardId);
    persistent.cardMeta[cardId] = {
      month: ctx.month,
      town: townOverride ?? ctx.town,
      run: persistent.runsCompleted,
    };
    events.push({ kind: 'card', id: cardId });
  }
}

export function grantClue(
  spec: Spec,
  persistent: PersistentState,
  clueId: string,
  ctx: GrantContext,
): UnlockEvent[] {
  const events: UnlockEvent[] = [];
  spec.chronicles
    .filter((c) => c.unlock === `clue:${clueId}`)
    .forEach((c) => openChronicle(spec, persistent, c.id, events));
  spec.cards
    .filter((c) => c.earn === `clue:${clueId}`)
    .forEach((c) => earnCard(spec, persistent, c.id, ctx, events));
  return events;
}

export function grantDecree(
  spec: Spec,
  persistent: PersistentState,
  decreeId: string,
  ctx: GrantContext,
): UnlockEvent[] {
  const events: UnlockEvent[] = [];
  spec.cards
    .filter((c) => c.earn === `decree:${decreeId}`)
    .forEach((c) => earnCard(spec, persistent, c.id, ctx, events));
  return events;
}

export function grantTownBurned(
  spec: Spec,
  persistent: PersistentState,
  run: RunState,
  ctx: GrantContext,
): UnlockEvent[] {
  const burned = Object.values(run.towns).find((t) => t.pop > 0 && t.D / t.pop >= 0.5);
  if (!burned) return [];
  const events: UnlockEvent[] = [];
  spec.cards
    .filter((c) => c.earn === 'town-burned-out:first')
    .forEach((c) => earnCard(spec, persistent, c.id, ctx, events, burned.id));
  return events;
}

export function grantRunEnd(
  spec: Spec,
  persistent: PersistentState,
  ctx: GrantContext,
): UnlockEvent[] {
  const events: UnlockEvent[] = [];
  spec.chronicles
    .filter((c) => c.unlock === 'run-end')
    .forEach((c) => openChronicle(spec, persistent, c.id, events));
  spec.cards
    .filter((c) => c.earn === 'run-end:first')
    .forEach((c) => earnCard(spec, persistent, c.id, ctx, events));
  return events;
}

export function grantQuestionSolved(
  spec: Spec,
  persistent: PersistentState,
  questionId: string,
  ctx: GrantContext,
): UnlockEvent[] {
  const events: UnlockEvent[] = [];
  spec.cards
    .filter((c) => c.earn === `solved:${questionId}`)
    .forEach((c) => earnCard(spec, persistent, c.id, ctx, events));
  return events;
}

export function grantLens(
  spec: Spec,
  persistent: PersistentState,
  ctx: GrantContext,
): UnlockEvent[] {
  const events: UnlockEvent[] = [];
  persistent.lensUnlocked = true;
  spec.chronicles
    .filter((c) => c.unlock === 'lens')
    .forEach((c) => openChronicle(spec, persistent, c.id, events));
  spec.cards
    .filter((c) => c.earn === 'lens')
    .forEach((c) => earnCard(spec, persistent, c.id, ctx, events));
  return events;
}

export function assistCluesFor(spec: Spec, persistent: PersistentState): string[] {
  const after = spec.sim.assist.afterStewardships;
  return ['c-dead-rats', 'c-coughing', 'c-ragman'].filter(
    (clue) => (persistent.assistMissCounts[clue] ?? 0) >= after,
  );
}

export function applyRunCompletion(
  spec: Spec,
  persistent: PersistentState,
  run: RunState,
  ctx: GrantContext,
): UnlockEvent[] {
  persistent.runsCompleted += 1;
  for (const clue of ['c-dead-rats', 'c-coughing', 'c-ragman']) {
    persistent.assistMissCounts[clue] = persistent.cluesFound.includes(clue)
      ? 0
      : (persistent.assistMissCounts[clue] ?? 0) + 1;
  }
  return grantRunEnd(spec, persistent, ctx);
}

export function markChronicleRead(persistent: PersistentState, chronicleId: string): void {
  if (!persistent.chroniclesRead.includes(chronicleId)) persistent.chroniclesRead.push(chronicleId);
}

export function markCodexRead(persistent: PersistentState, codexId: string): void {
  if (!persistent.codexRead.includes(codexId)) persistent.codexRead.push(codexId);
}

export function markCardFlipped(persistent: PersistentState, cardId: string): void {
  if (!persistent.cardsFlipped.includes(cardId)) persistent.cardsFlipped.push(cardId);
}

export function earnedCaption(
  spec: Spec,
  persistent: PersistentState,
  cardId: string,
): string | null {
  const card = spec.cards.find((c) => c.id === cardId);
  const meta = persistent.cardMeta[cardId];
  if (!card || !meta) return null;
  const start = spec.sim.startCalendarMonth;
  const startYear = startYearFromSpec(spec);
  const month = monthName(calendarMonth(start, meta.month));
  const year = calendarYear(start, meta.month, startYear);
  const town = meta.town ? (spec.towns.find((t) => t.id === meta.town)?.name ?? meta.town) : '';
  return fillPlaceholders(card.caption, { month: `${month} ${year}`, town });
}
