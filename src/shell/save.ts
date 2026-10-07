import type { SerializedRun } from '../engine/serialize';
import type { KVStore } from './persistence';
import { createJournal, type PersistentState, type RunJournal } from './state';

export const SAVE_SCHEMA = 1;
export const SAVE_KEY = 'tgm.save.v1';

export interface SaveDocument {
  schema: number;
  app: string;
  specVersion: string;
  savedAt: string;
  persistent: PersistentState;
  run: SerializedRun | null;
  journal: RunJournal;
}

export class SaveStore {
  constructor(
    private readonly store: KVStore,
    private readonly specVersion: string,
  ) {}

  async load(): Promise<SaveDocument | null> {
    try {
      const raw = await this.store.get(SAVE_KEY);
      if (!raw) return null;
      const doc = JSON.parse(raw) as SaveDocument;
      if (
        !doc ||
        doc.schema !== SAVE_SCHEMA ||
        doc.app !== 'the-great-mortality' ||
        typeof doc.persistent !== 'object' ||
        doc.persistent === null
      ) {
        return null;
      }
      if (!doc.journal || !Array.isArray(doc.journal.entries)) doc.journal = createJournal();
      return doc;
    } catch {
      return null;
    }
  }

  async save(
    persistent: PersistentState,
    run: SerializedRun | null,
    journal: RunJournal = createJournal(),
  ): Promise<void> {
    const doc: SaveDocument = {
      schema: SAVE_SCHEMA,
      app: 'the-great-mortality',
      specVersion: this.specVersion,
      savedAt: new Date().toISOString(),
      persistent,
      run,
      journal,
    };
    try {
      await this.store.set(SAVE_KEY, JSON.stringify(doc));
    } catch {
      return;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.store.remove(SAVE_KEY);
    } catch {
      return;
    }
  }
}

function checksum(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function toBase64Url(binary: string): string {
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

export function encodeSaveCode(doc: SaveDocument): string {
  const json = JSON.stringify(doc);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `TGM1.${checksum(json)}.${toBase64Url(binary)}`;
}

export function decodeSaveCode(code: string): SaveDocument {
  const parts = code.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'TGM1') {
    throw new Error('This is not a Great Mortality progress code.');
  }
  const [, sum, payload] = parts;
  let json: string;
  try {
    const binary = fromBase64Url(payload ?? '');
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } catch {
    throw new Error('This progress code is damaged.');
  }
  if (checksum(json) !== sum) {
    throw new Error('This progress code is damaged.');
  }
  let doc: SaveDocument;
  try {
    doc = JSON.parse(json) as SaveDocument;
  } catch {
    throw new Error('This progress code is damaged.');
  }
  if (!doc || doc.schema !== SAVE_SCHEMA || doc.app !== 'the-great-mortality') {
    throw new Error('This progress code is from a different version.');
  }
  return doc;
}
