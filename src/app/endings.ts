import { epithet, living, survival } from '../engine/engine';
import type { RunState } from '../engine/types';
import { fillPlaceholders } from '../spec/markup';
import type { Spec } from '../spec/types';
import type { PersistentState } from '../shell/state';
import { calendarMonth, calendarYear, monthName, startYearFromSpec } from '../skin/calendar';

const ACTION_ORDER = ['shipsHeld', 'portClosed', 'sealed', 'clean', 'processions', 'physicians', 'herbs'];

export function citationFor(spec: Spec, run: RunState): string {
  const c = run.counters;
  const scores: Record<string, number> = {
    shipsHeld: c.shipsHeldMonths,
    portClosed: c.portClosedMonths,
    sealed: c.sealMonths,
    clean: c.cleans,
    processions: c.processions,
    physicians: c.physicians,
    herbs: c.herbs,
  };
  const top = ACTION_ORDER.filter((key) => (scores[key] ?? 0) > 0)
    .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
    .slice(0, 2)
    .map((key) => spec.epithets.actionPhrases[key] ?? '')
    .filter(Boolean);
  if (!top.length) {
    const none = spec.epithets.actionPhrases.none;
    if (none) top.push(none);
  }
  return top.join(' and ');
}

export interface ReckoningTown {
  id: string;
  name: string;
  pct: number;
  spared: boolean;
}

export interface ReckoningView {
  kicker: string;
  survivalPct: number;
  soulsLabel: string;
  towns: ReckoningTown[];
  mystery: { solved: number; total: number; newSolved: number };
  newCounts: { chronicles: number; cards: number; codex: number };
  epithet: { id: string; name: string; citation: string };
  epithetNames: { id: string; name: string; earned: boolean }[];
  epithetsEarned: number;
  epithetTotal: number;
}

function countFlags(run: RunState, prefix: string): number {
  return Object.keys(run.flags).filter((key) => key.startsWith(prefix)).length;
}

export function reckoningView(spec: Spec, persistent: PersistentState, run: RunState): ReckoningView {
  const towns: ReckoningTown[] = spec.towns.map((t) => {
    const state = run.towns[t.id]!;
    return {
      id: t.id,
      name: t.name,
      pct: Math.round((1 - state.D / state.pop) * 100),
      spared: state.D === 0,
    };
  });
  let souls = 0;
  let pop = 0;
  Object.values(run.towns).forEach((t) => {
    souls += Math.round(living(t));
    pop += t.pop;
  });
  const current = epithet(run);
  const def = spec.epithets.list.find((e) => e.id === current);
  const citation = fillPlaceholders(def?.citation ?? '', { actions: citationFor(spec, run) });
  return {
    kicker: fillPlaceholders(spec.endings.normal.kicker, { steward: run.steward }),
    survivalPct: Math.round(survival(run) * 100),
    soulsLabel: `${souls.toLocaleString('en-US')} of ${pop.toLocaleString('en-US')} souls`,
    towns,
    mystery: {
      solved: persistent.mysterySolved.length,
      total: spec.mystery.questions.length,
      newSolved: countFlags(run, 'solved:'),
    },
    newCounts: {
      chronicles: countFlags(run, 'new:chronicle:'),
      cards: countFlags(run, 'new:card:'),
      codex: countFlags(run, 'new:codex:'),
    },
    epithet: { id: current, name: def?.name ?? current, citation },
    epithetNames: spec.epithets.order.map((id) => {
      const entry = spec.epithets.list.find((e) => e.id === id);
      return { id, name: entry?.name ?? id, earned: persistent.epithetsEarned.includes(id) };
    }),
    epithetsEarned: persistent.epithetsEarned.length,
    epithetTotal: spec.epithets.order.length,
  };
}

export interface EndingView {
  kind: 'overthrown' | 'fled';
  label: string;
  steward: string;
  epithetWord: string;
  body: string;
  footnote: string;
  unrest: number;
  survivalPct: number;
  mysterySolved: number;
  mysteryTotal: number;
  fledPctLabel: string;
}

export function endingView(spec: Spec, persistent: PersistentState, run: RunState): EndingView {
  const kind = run.ended === 'fled' ? 'fled' : 'overthrown';
  const ev = spec.endings[kind];
  const endMonth =
    typeof run.flags['shell:endMonth'] === 'string' ? Number(run.flags['shell:endMonth']) : run.month;
  const cal = calendarMonth(spec.sim.startCalendarMonth, endMonth);
  const year = calendarYear(spec.sim.startCalendarMonth, endMonth, startYearFromSpec(spec));
  const title = fillPlaceholders(ev.title, { steward: run.steward });
  const suffix = title.replace(run.steward, '').trim();
  return {
    kind,
    label: `${monthName(cal).toUpperCase()} ${year} · MONTH ${endMonth + 1} OF ${spec.sim.months}`,
    steward: run.steward,
    epithetWord: suffix || (kind === 'fled' ? 'the Fled' : 'the Overthrown'),
    body: ev.body,
    footnote: ev.footnote,
    unrest: Math.round(run.unrest),
    survivalPct: Math.round(survival(run) * 100),
    mysterySolved: persistent.mysterySolved.length,
    mysteryTotal: spec.mystery.questions.length,
    fledPctLabel: `${Math.round(survival(run) * 100)}% survived`,
  };
}
