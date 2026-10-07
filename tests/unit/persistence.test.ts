import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import {
  createDefaultStore,
  createIndexedDbStore,
  createLocalStorageStore,
  createMemoryStore,
} from '../../src/shell/persistence';
import { SAVE_KEY, SaveStore } from '../../src/shell/save';
import { createPersistentState } from '../../src/shell/state';

function fakeWebStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
  };
}

test('the memory store round-trips values', async () => {
  const store = createMemoryStore();
  expect(await store.get('a')).toBeNull();
  await store.set('a', '1');
  expect(await store.get('a')).toBe('1');
  await store.remove('a');
  expect(await store.get('a')).toBeNull();
});

test('the localStorage store round-trips values', async () => {
  const store = createLocalStorageStore(fakeWebStorage());
  expect(store.kind).toBe('localstorage');
  await store.set('k', 'v');
  expect(await store.get('k')).toBe('v');
  await store.set('k', 'v2');
  expect(await store.get('k')).toBe('v2');
  await store.remove('k');
  expect(await store.get('k')).toBeNull();
});

test('the indexeddb store round-trips values', async () => {
  const store = await createIndexedDbStore(`tgm-test-${Math.random().toString(36).slice(2)}`);
  expect(store).not.toBeNull();
  expect(store!.kind).toBe('indexeddb');
  await store!.set('k', 'v');
  expect(await store!.get('k')).toBe('v');
  await store!.remove('k');
  expect(await store!.get('k')).toBeNull();
});

test('the default store prefers indexeddb when it works', async () => {
  const store = await createDefaultStore();
  expect(store.kind).toBe('indexeddb');
});

test('SaveStore round-trips a save document', async () => {
  const store = createMemoryStore();
  const saves = new SaveStore(store, '1.0.0');
  expect(await saves.load()).toBeNull();

  const persistent = createPersistentState();
  persistent.cluesFound.push('c-galleys');
  await saves.save(persistent, null, {
    entries: [{ month: 2, kind: 'clue', refId: 'c-galleys', townId: 'collina' }],
  });

  const doc = await saves.load();
  expect(doc).not.toBeNull();
  expect(doc!.specVersion).toBe('1.0.0');
  expect(doc!.persistent.cluesFound).toEqual(['c-galleys']);
  expect(doc!.run).toBeNull();
  expect(doc!.journal.entries).toHaveLength(1);
  expect(typeof doc!.savedAt).toBe('string');
});

test('a save without a journal loads with an empty journal', async () => {
  const store = createMemoryStore();
  const saves = new SaveStore(store, '1.0.0');
  await store.set(
    SAVE_KEY,
    JSON.stringify({
      schema: 1,
      app: 'the-great-mortality',
      specVersion: '1.0.0',
      savedAt: 'x',
      persistent: createPersistentState(),
      run: null,
    }),
  );
  const doc = await saves.load();
  expect(doc!.journal.entries).toEqual([]);
});

test('SaveStore returns null for missing, corrupt or foreign data', async () => {
  const store = createMemoryStore();
  const saves = new SaveStore(store, '1.0.0');
  expect(await saves.load()).toBeNull();

  await store.set(SAVE_KEY, '{not json');
  expect(await saves.load()).toBeNull();

  await store.set(SAVE_KEY, JSON.stringify({ schema: 999, app: 'other' }));
  expect(await saves.load()).toBeNull();
});
