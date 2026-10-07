import type { SolveRule, Spec } from '../spec/types';
import {
  autoplayToEnd,
  createRun,
  endMonth,
  epithet,
  issueDecree,
  liftDecree,
  survival,
} from './engine';
import type { MonthReport, RunState } from './types';

export interface EngineApi {
  createRun(
    spec: Spec,
    opts?: { seed?: number; stewardName?: string; assistClues?: string[] },
  ): RunState;
  issueDecree(
    s: RunState,
    id: string,
    townId?: string,
  ): { ok: boolean; reason?: string; ended?: string | null; unlocks?: string[] };
  liftDecree(s: RunState, id: string, townId?: string): { ok: boolean };
  endMonth(s: RunState): MonthReport;
  survival(s: RunState): number;
  epithet(s: RunState, solvedThisRun?: boolean): string;
  autoplayToEnd(s: RunState): void;
}

export type Strategy = (s: RunState, rep: MonthReport | null) => void;

export interface StrategySummary {
  name: string;
  runs: number;
  avgSurvival: number;
  p10: number;
  p90: number;
  overthrownShare: number;
  fonteneraSparedShare: number;
  clueRates: Record<string, number>;
  epithets: Record<string, number>;
}

export function makeStrategies(E: EngineApi): Record<string, Strategy> {
  return {
    'do nothing': () => {},
    'smart (hold ships, clean port + market, seal ravaged towns)': (s, rep) => {
      if (s.month === 0) {
        E.issueDecree(s, 'hold-ships');
        E.issueDecree(s, 'clean-streets', 'portoreale');
      } else if (s.month === 1) {
        E.issueDecree(s, 'clean-streets', 'santa-lucia');
      } else if (rep) {
        Object.entries(rep.casesByTown).forEach(([id, cases]) => {
          if (cases > 20 && !s.towns[id].sealed && s.decreesLeft) {
            E.issueDecree(s, 'seal-roads', id);
          }
        });
      }
      if (s.unrest > 80) {
        Object.values(s.towns).forEach((t) => {
          if (t.sealed) E.liftDecree(s, 'seal-roads', t.id);
        });
      }
    },
    'careful (hold ships + clean port and market, nothing else)': (s) => {
      if (s.month === 0) {
        E.issueDecree(s, 'hold-ships');
        E.issueDecree(s, 'clean-streets', 'portoreale');
      }
      if (s.month === 1) {
        E.issueDecree(s, 'clean-streets', 'santa-lucia');
      }
    },
    'hold ships only': (s) => {
      if (s.month === 0) E.issueDecree(s, 'hold-ships');
    },
    'close the port all game': (s) => {
      if (s.month === 0) E.issueDecree(s, 'close-port');
    },
    'processions everywhere': (s, rep) => {
      if (rep) {
        Object.entries(rep.casesByTown)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .forEach(([id, cases]) => {
            if (cases > 0) E.issueDecree(s, 'procession', id);
          });
      }
    },
    'herbs + physicians (medieval medicine)': (s, rep) => {
      if (rep) {
        const top = Object.entries(rep.casesByTown).sort((a, b) => b[1] - a[1])[0];
        if (top[1] > 0) {
          E.issueDecree(s, 'burn-herbs', top[0]);
          E.issueDecree(s, 'hire-physicians', top[0]);
        }
      }
    },
  };
}

const engineApi: EngineApi = {
  createRun,
  issueDecree,
  liftDecree,
  endMonth,
  survival,
  epithet,
  autoplayToEnd,
};

function pct(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(p * (sorted.length - 1))];
}

function rateMap(counts: Record<string, number>, runs: number): Record<string, number> {
  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value / runs]));
}

export function runBalance(spec: Spec, runs = 300, seedBase = 1000): StrategySummary[] {
  const strategies = makeStrategies(engineApi);
  const summaries: StrategySummary[] = [];
  for (const [name, play] of Object.entries(strategies)) {
    const surv: number[] = [];
    const eps: Record<string, number> = {};
    const clues: Record<string, number> = {};
    const fontenera: number[] = [];
    let overthrown = 0;
    for (let i = 0; i < runs; i++) {
      const s = createRun(spec, { seed: seedBase + i });
      let rep: MonthReport | null = null;
      const found = new Set<string>();
      while (!s.ended) {
        play(s, rep);
        rep = endMonth(s);
        rep.clues.forEach((clue) => {
          if (!found.has(clue.id)) {
            found.add(clue.id);
            clues[clue.id] = (clues[clue.id] || 0) + 1;
          }
        });
      }
      if (s.ended === 'overthrown') {
        overthrown++;
        autoplayToEnd(s);
      }
      surv.push(survival(s));
      const ep = epithet(s);
      eps[ep] = (eps[ep] || 0) + 1;
      fontenera.push(s.towns.fontenera.D === 0 ? 1 : 0);
    }
    const avg = surv.reduce((a, b) => a + b, 0) / runs;
    summaries.push({
      name,
      runs,
      avgSurvival: avg,
      p10: pct(surv, 0.1),
      p90: pct(surv, 0.9),
      overthrownShare: overthrown / runs,
      fonteneraSparedShare: fontenera.reduce((a, b) => a + b, 0) / runs,
      clueRates: rateMap(clues, runs),
      epithets: rateMap(eps, runs),
    });
  }
  return summaries;
}

export function runMysteryPacing(
  spec: Spec,
  games = 300,
): { median: number; p90: number; max: number } {
  const strategies = makeStrategies(engineApi);
  const requirements: SolveRule[] = spec.mystery.questions.map((q) => q.solveRule);
  const solved = (found: Set<string>, rule: SolveRule): boolean =>
    (rule.all || []).every((clue) => found.has(clue)) &&
    (rule.anyOf || []).filter((clue) => found.has(clue)).length >= (rule.need || 0);
  const assistAfter = spec.sim.assist?.afterStewardships || 3;
  const names = Object.keys(strategies);
  const runsNeeded: number[] = [];
  for (let k = 0; k < games; k++) {
    const found = new Set<string>(['c-galleys']);
    let n = 0;
    while (!requirements.every((rule) => solved(found, rule)) && n < 20) {
      const play = strategies[names[(k + n) % names.length]];
      const missing =
        n >= assistAfter
          ? ['c-dead-rats', 'c-coughing', 'c-ragman'].filter((clue) => !found.has(clue))
          : [];
      const s = createRun(spec, { seed: 50000 + k * 31 + n, assistClues: missing });
      let rep: MonthReport | null = null;
      while (!s.ended) {
        play(s, rep);
        rep = endMonth(s);
        rep.clues.forEach((clue) => found.add(clue.id));
      }
      n++;
    }
    runsNeeded.push(n);
  }
  runsNeeded.sort((a, b) => a - b);
  return {
    median: runsNeeded[150],
    p90: runsNeeded[270],
    max: runsNeeded[299],
  };
}
