import type { MonthReport } from '../engine/types';
import { fillPlaceholders } from '../spec/markup';
import type { Spec } from '../spec/types';
import { calendarMonth, monthTag } from '../skin/calendar';
import { createJournal, type RunJournal } from '../shell/state';

export { createJournal };
export type { JournalEntry, RunJournal } from '../shell/state';

export interface LatelyLine {
  month: number;
  monthTag: string;
  text: string;
}

export function addReportEntries(spec: Spec, journal: RunJournal, report: MonthReport): void {
  for (const clue of report.clues ?? []) {
    if (!clue.town) continue;
    journal.entries.push({ month: report.month, kind: 'clue', refId: clue.id, townId: clue.town });
  }
  for (const event of report.events ?? []) {
    if (typeof event === 'string') {
      const townId =
        event === 'held-ship-leak'
          ? spec.sim.portTown
          : event === 'overland-arrival'
            ? spec.sim.overland.entryTown
            : undefined;
      journal.entries.push({ month: report.month, kind: 'event', refId: event, townId });
    } else if (event.id === 'ragman') {
      journal.entries.push({
        month: report.month,
        kind: 'event',
        refId: 'ragman',
        townId: event.to,
        fromTownId: event.from,
      });
    }
  }
}

export function addDecreeEntry(
  journal: RunJournal,
  month: number,
  decreeId: string,
  townId?: string,
): void {
  journal.entries.push({ month, kind: 'decree', refId: decreeId, townId });
}

export function latestForTown(
  spec: Spec,
  journal: RunJournal,
  townId: string,
  limit = 3,
): LatelyLine[] {
  const nameOf = (id?: string) => (id ? spec.towns.find((t) => t.id === id)?.name ?? id : '');
  return journal.entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.townId === townId)
    .sort((a, b) => b.entry.month - a.entry.month || b.index - a.index)
    .slice(0, limit)
    .map(({ entry }) => {
      let text = '';
      if (entry.kind === 'clue') {
        const clue = spec.mystery.clues.find((c) => c.id === entry.refId);
        text = fillPlaceholders(clue?.reportText ?? clue?.title ?? entry.refId, {
          town: nameOf(entry.townId),
        });
      } else if (entry.kind === 'event') {
        text = fillPlaceholders(spec.reportLines[entry.refId] ?? '', {
          from: nameOf(entry.fromTownId),
          to: nameOf(entry.townId),
        });
      } else {
        text = spec.decrees.find((d) => d.id === entry.refId)?.name ?? entry.refId;
      }
      return {
        month: entry.month,
        monthTag: monthTag(calendarMonth(spec.sim.startCalendarMonth, entry.month)),
        text,
      };
    });
}
