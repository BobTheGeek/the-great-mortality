import { expect, test } from 'vitest';
import specRaw from '../../design_handoff_great_mortality/content/sim-spec.json';
import type { MonthReport } from '../../src/engine/types';
import type { Spec } from '../../src/spec/types';
import {
  addDecreeEntry,
  addReportEntries,
  createJournal,
  latestForTown,
} from '../../src/app/journal';

const spec = specRaw as unknown as Spec;

function report(overrides: Partial<MonthReport> = {}): MonthReport {
  return {
    month: 2,
    events: [],
    clues: [],
    deathsByTown: {},
    casesByTown: {},
    ...overrides,
  };
}

test('clue findings and events land in the journal with their towns', () => {
  const journal = createJournal();
  addReportEntries(
    spec,
    journal,
    report({
      clues: [{ id: 'c-dead-rats', town: 'collina' }],
      events: [{ id: 'ragman', from: 'portoreale', to: 'santa-lucia' }],
    }),
  );
  expect(journal.entries).toHaveLength(2);
  expect(journal.entries[0]).toMatchObject({ kind: 'clue', refId: 'c-dead-rats', townId: 'collina' });
  expect(journal.entries[1]).toMatchObject({
    kind: 'event',
    refId: 'ragman',
    townId: 'santa-lucia',
    fromTownId: 'portoreale',
  });
});

test('the ship-leak and overland events attach to their towns', () => {
  const journal = createJournal();
  addReportEntries(spec, journal, report({ events: ['held-ship-leak', 'overland-arrival'] }));
  expect(journal.entries[0]).toMatchObject({ refId: 'held-ship-leak', townId: 'portoreale' });
  expect(journal.entries[1]).toMatchObject({ refId: 'overland-arrival', townId: 'santa-lucia' });
});

test('lately lists the most recent entries first and fills town names', () => {
  const journal = createJournal();
  addDecreeEntry(journal, 0, 'hold-ships', 'portoreale');
  addReportEntries(spec, journal, report({ month: 2, clues: [{ id: 'c-dead-rats', town: 'collina' }] }));
  addReportEntries(
    spec,
    journal,
    report({ month: 1, events: [{ id: 'ragman', from: 'portoreale', to: 'santa-lucia' }] }),
  );

  const port = latestForTown(spec, journal, 'portoreale');
  expect(port).toHaveLength(1);
  expect(port[0]!.text).toBe('Hold ships offshore forty days');
  expect(port[0]!.monthTag).toBe('NOV');

  const collina = latestForTown(spec, journal, 'collina');
  expect(collina[0]!.text).toContain('Collina');
  expect(collina[0]!.text).not.toContain('{town}');

  const santa = latestForTown(spec, journal, 'santa-lucia');
  expect(santa[0]!.text).toContain('Portoreale');
  expect(santa[0]!.text).toContain('Santa Lucia');
});

test('lately respects its limit', () => {
  const journal = createJournal();
  addDecreeEntry(journal, 0, 'hold-ships', 'portoreale');
  addDecreeEntry(journal, 1, 'clean-streets', 'portoreale');
  addDecreeEntry(journal, 2, 'hire-physicians', 'portoreale');
  addDecreeEntry(journal, 3, 'burn-herbs', 'portoreale');
  expect(latestForTown(spec, journal, 'portoreale')).toHaveLength(3);
  expect(latestForTown(spec, journal, 'portoreale')[0]!.text).toBe('Burn herbs to cleanse the air');
});
