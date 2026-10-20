import type { RunState } from '../engine/types';
import type { Spec } from '../spec/types';
import type { PersistentState } from '../shell/state';
import { calendarMonth, calendarYear, monthName, startYearFromSpec } from '../skin/calendar';
import { deriveTownState } from '../skin/town-state';

export function hasHistory(
  _spec: Spec,
  persistent: PersistentState,
  run: RunState | null,
): boolean {
  if (run) return true;
  return (
    persistent.cluesFound.length > 0 ||
    persistent.codexSeen.length > 0 ||
    persistent.chroniclesOpened.length > 0 ||
    persistent.cardsEarned.length > 0 ||
    persistent.epithetsEarned.length > 0 ||
    persistent.runsCompleted > 0 ||
    persistent.lensUnlocked
  );
}

export function saveSummary(spec: Spec, run: RunState): string {
  const healthy = spec.towns.filter(
    (town) => deriveTownState(run.towns[town.id]!) === 'healthy',
  ).length;
  const cal = calendarMonth(spec.sim.startCalendarMonth, run.month);
  const year = calendarYear(spec.sim.startCalendarMonth, run.month, startYearFromSpec(spec));
  return `${run.steward} · ${monthName(cal)} ${year} · ${healthy} town${
    healthy === 1 ? '' : 's'
  } healthy`;
}

export function nameChoices(spec: Spec, page: number): string[] {
  const pool = spec.opening.namePool;
  if (!pool.length) return [];
  return Array.from({ length: 4 }, (_, index) => pool[(page * 4 + index) % pool.length]!);
}

export function namePageCount(spec: Spec): number {
  return Math.max(1, Math.ceil(spec.opening.namePool.length / 4));
}
