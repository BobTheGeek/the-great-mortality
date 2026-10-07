import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import type { MonthReport } from '../../src/engine/types';
import type { Spec } from '../../src/spec/types';
import {
  CAL_MONTHS,
  calendarMonth,
  calendarYear,
  monthName,
  monthTag,
  seasonOf,
  startYearFromSpec,
} from '../../src/skin/calendar';
import { unrestBandWord } from '../../src/skin/unrest';
import { composeReport } from '../../src/skin/report';

const spec = specRaw as unknown as Spec;

function report(overrides: Partial<MonthReport> = {}): MonthReport {
  return {
    month: 0,
    events: [],
    clues: [],
    deathsByTown: {
      portoreale: 0,
      'santa-lucia': 0,
      'san-benedetto': 0,
      collina: 0,
      pietrabianca: 0,
      fontenera: 0,
    },
    casesByTown: {},
    income: 1200,
    unrestDelta: 9,
    deaths: 0,
    ended: null,
    ...overrides,
  };
}

test('calendar helpers map game months to real months', () => {
  expect(CAL_MONTHS.length).toBe(12);
  expect(calendarMonth(10, 0)).toBe(10);
  expect(monthName(10)).toBe('November');
  expect(calendarMonth(10, 2)).toBe(0);
  expect(monthName(calendarMonth(10, 2))).toBe('January');
  expect(calendarYear(10, 0)).toBe(1347);
  expect(calendarYear(10, 2)).toBe(1348);
  expect(calendarYear(10, 17)).toBe(1349);
  expect(monthTag(1)).toBe('FEB');
  expect(seasonOf(11)).toBe('winter');
  expect(seasonOf(1)).toBe('winter');
  expect(seasonOf(3)).toBe('spring');
  expect(seasonOf(6)).toBe('summer');
  expect(seasonOf(9)).toBe('autumn');
});

test('the start year comes from the shipped spec copy', () => {
  expect(startYearFromSpec(spec)).toBe(1347);
});

test('report headers come from the month that just ended', () => {
  const view = composeReport(spec, report(), { previouslyFound: new Set() });
  expect(view.heading).toBe('November, the year of our Lord 1347');
  expect(view.monthLabel).toBe('MONTH 1 OF 18');
  expect(view.nextLabel).toBe('On to December');
});

test('burials bars scale to the month maximum with a floor for small months', () => {
  const view = composeReport(
    spec,
    report({
      deaths: 1410,
      deathsByTown: {
        portoreale: 1410,
        'santa-lucia': 340,
        'san-benedetto': 0,
        collina: 40,
        pietrabianca: 0,
        fontenera: 0,
      },
    }),
    { previouslyFound: new Set() },
  );
  expect(view.buriedThisMonth).toBe(1410);
  const port = view.burials.find((b) => b.id === 'portoreale')!;
  expect(port.valueLabel).toBe('1,410');
  expect(port.barPct).toBeCloseTo(1410 / (1410 * 1.6), 5);
  const empty = view.burials.find((b) => b.id === 'san-benedetto')!;
  expect(empty.valueLabel).toBe('—');
  expect(empty.barPct).toBe(0);
});

test('written lines include found clue texts and event lines filled with town names', () => {
  const view = composeReport(
    spec,
    report({
      clues: [{ id: 'c-ragman', town: 'santa-lucia' }],
      events: [{ id: 'ragman', from: 'portoreale', to: 'santa-lucia' }],
    }),
    { previouslyFound: new Set() },
  );
  expect(view.written.some((line) => line.includes('Santa Lucia'))).toBe(true);
  expect(view.written.some((line) => line.includes('beds of the dead') || line.includes('bedding'))).toBe(true);
  expect(view.written.join(' ')).not.toContain('{town}');
  expect(view.written.join(' ')).not.toContain('{from}');
});

test('a quiet month falls back to the approved quiet lines', () => {
  const view = composeReport(spec, report(), { previouslyFound: new Set() });
  expect(spec.quietReportLines).toContain(view.written[0]!);
});

test('only newly found clues land in the pinned box', () => {
  const fresh = composeReport(spec, report({ clues: [{ id: 'c-ragman', town: 'collina' }] }), {
    previouslyFound: new Set(),
  });
  expect(fresh.newClues.map((c) => c.id)).toEqual(['c-ragman']);
  expect(fresh.newClues[0]!.text).toContain('Collina');

  const known = composeReport(spec, report({ clues: [{ id: 'c-ragman', town: 'collina' }] }), {
    previouslyFound: new Set(['c-ragman']),
  });
  expect(known.newClues).toEqual([]);
});

test('the footer pairs unrest and treasury summaries', () => {
  const view = composeReport(spec, report(), { previouslyFound: new Set() });
  expect(view.footer).toBe('Unrest rose 9. Treasury took 1,200 [[florin|florins]] in tolls and tithes.');
});

test('a falling unrest month says fell', () => {
  const view = composeReport(spec, report({ unrestDelta: -4 }), { previouslyFound: new Set() });
  expect(view.footer).toContain('Unrest fell 4.');
});

test('unrest band helper is exported alongside the calendar', () => {
  expect(unrestBandWord(spec, 25)).toBe('grumbling at the quay');
});
