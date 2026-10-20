import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSpec } from '../../src/spec/load';

const spec = loadSpec();

describe('card engravings', () => {
  it('every myth-buster card ships a local engraving', () => {
    for (const card of spec.cards) {
      const path = join(process.cwd(), 'public', 'cards', `${card.id}.jpg`);
      expect(existsSync(path), `missing art for ${card.id}`).toBe(true);
      const size = statSync(path).size;
      expect(size, `${card.id} art too small`).toBeGreaterThan(10_000);
      expect(size, `${card.id} art too large`).toBeLessThan(600_000);
    }
  });
});
