import type { MonthReport } from '../engine/types';
import { fillPlaceholders } from '../spec/markup';
import type { Spec } from '../spec/types';
import { calendarMonth, calendarYear, monthName, startYearFromSpec } from './calendar';

export interface ReportBurial {
  id: string;
  name: string;
  deaths: number;
  barPct: number;
  valueLabel: string;
}

export interface ReportView {
  heading: string;
  monthLabel: string;
  buriedThisMonth: number;
  burials: ReportBurial[];
  written: string[];
  newClues: { id: string; title: string; text: string }[];
  footer: string;
  nextLabel: string;
}

function townName(spec: Spec, id?: string): string {
  if (!id) return '';
  return spec.towns.find((t) => t.id === id)?.name ?? id;
}

function composeBurials(spec: Spec, report: MonthReport): ReportBurial[] {
  const rows = spec.towns.map((t) => {
    const deaths = report.deathsByTown[t.id] ?? 0;
    return { id: t.id, name: t.name, deaths };
  });
  const max = Math.max(0, ...rows.map((r) => r.deaths));
  const scale = Math.max(200, max * 1.6);
  return rows.map((r) => ({
    ...r,
    barPct: r.deaths > 0 ? Math.min(1, r.deaths / scale) : 0,
    valueLabel: r.deaths > 0 ? r.deaths.toLocaleString('en-US') : '—',
  }));
}

function composeWritten(spec: Spec, report: MonthReport): string[] {
  const lines: string[] = [];
  for (const clue of report.clues ?? []) {
    const def = spec.mystery.clues.find((c) => c.id === clue.id);
    if (def?.reportText) {
      lines.push(fillPlaceholders(def.reportText, { town: townName(spec, clue.town) }));
    }
  }
  for (const event of report.events ?? []) {
    if (typeof event === 'string') {
      const template = spec.reportLines[event];
      if (template) lines.push(fillPlaceholders(template, {}));
    } else if (event.id === 'ragman') {
      lines.push(
        fillPlaceholders(spec.reportLines.ragman ?? '', {
          from: townName(spec, event.from),
          to: townName(spec, event.to),
        }),
      );
    } else if (spec.reportLines[event.id]) {
      lines.push(fillPlaceholders(spec.reportLines[event.id], {}));
    }
  }
  if (!lines.length) {
    const quiet = spec.quietReportLines ?? [];
    if (quiet.length) lines.push(quiet[report.month % quiet.length]!);
  }
  return lines;
}

function composeFooter(spec: Spec, report: MonthReport): string {
  const parts: string[] = [];
  const delta = report.unrestDelta ?? 0;
  if (delta > 0) {
    parts.push(fillPlaceholders(spec.reportLines.unrestUp ?? '', { n: Math.abs(delta) }));
  } else if (delta < 0) {
    parts.push(fillPlaceholders(spec.reportLines.unrestDown ?? '', { n: Math.abs(delta) }));
  }
  if (report.income != null) {
    parts.push(
      fillPlaceholders(spec.reportLines.income ?? '', {
        income: report.income.toLocaleString('en-US'),
      }),
    );
  }
  return parts.join(' ');
}

export function composeReport(
  spec: Spec,
  report: MonthReport,
  opts: { previouslyFound: Set<string> },
): ReportView {
  const startYear = startYearFromSpec(spec);
  const cal = calendarMonth(spec.sim.startCalendarMonth, report.month);
  const heading = `${monthName(cal)}, the year of our Lord ${calendarYear(
    spec.sim.startCalendarMonth,
    report.month,
    startYear,
  )}`;
  const nextCal = calendarMonth(spec.sim.startCalendarMonth, report.month + 1);
  const nextLabel = `On to ${monthName(nextCal)}`;
  const newClues = (report.clues ?? [])
    .filter((clue) => !opts.previouslyFound.has(clue.id))
    .map((clue) => {
      const def = spec.mystery.clues.find((c) => c.id === clue.id);
      return {
        id: clue.id,
        title: def?.title ?? clue.id,
        text: def ? fillPlaceholders(def.text, { town: townName(spec, clue.town) }) : '',
      };
    });
  return {
    heading,
    monthLabel: `MONTH ${report.month + 1} OF ${spec.sim.months}`,
    buriedThisMonth: report.deaths ?? 0,
    burials: composeBurials(spec, report),
    written: composeWritten(spec, report),
    newClues,
    footer: composeFooter(spec, report),
    nextLabel,
  };
}
