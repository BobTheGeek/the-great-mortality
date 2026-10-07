export type StoreKind = 'indexeddb' | 'localstorage' | 'memory';

export interface KVStore {
  kind: StoreKind;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createMemoryStore(): KVStore {
  const map = new Map<string, string>();
  return {
    kind: 'memory',
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

export function createLocalStorageStore(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): KVStore {
  return {
    kind: 'localstorage',
    async get(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        storage.setItem(key, value);
      } catch {
        return;
      }
    },
    async remove(key) {
      try {
        storage.removeItem(key);
      } catch {
        return;
      }
    },
  };
}

function openDb(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let open: IDBOpenDBRequest;
    try {
      open = factory.open(name, 1);
    } catch (error) {
      reject(error);
      return;
    }
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('IndexedDB open failed'));
    open.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

export async function createIndexedDbStore(
  dbName = 'tgm',
  factory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<KVStore | null> {
  if (!factory) return null;
  let db: IDBDatabase;
  try {
    db = await openDb(factory, dbName);
  } catch {
    return null;
  }
  const withStore = <T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> =>
    new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction('kv', mode);
      } catch (error) {
        reject(error);
        return;
      }
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      try {
        const request = fn(tx.objectStore('kv'));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      } catch (error) {
        reject(error);
      }
    });
  return {
    kind: 'indexeddb',
    async get(key) {
      const value = await withStore<unknown>('readonly', (store) => store.get(key) as IDBRequest<unknown>);
      return typeof value === 'string' ? value : null;
    },
    async set(key, value) {
      await withStore('readwrite', (store) => store.put(value, key));
    },
    async remove(key) {
      await withStore('readwrite', (store) => store.delete(key));
    },
  };
}

async function probe(store: KVStore): Promise<boolean> {
  try {
    const key = '__tgm_probe__';
    await store.set(key, 'ok');
    const value = await store.get(key);
    await store.remove(key);
    return value === 'ok';
  } catch {
    return false;
  }
}

export async function createDefaultStore(): Promise<KVStore> {
  const indexed = await createIndexedDbStore();
  if (indexed && (await probe(indexed))) return indexed;
  if (typeof globalThis.localStorage !== 'undefined') {
    const local = createLocalStorageStore(globalThis.localStorage);
    if (await probe(local)) return local;
  }
  return createMemoryStore();
}
