import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HOWTO_SLIDES } from '../../src/skin/howto';
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

describe('how-to slides', () => {
  it('every slide ships its image and copy', () => {
    expect(HOWTO_SLIDES.length).toBeGreaterThanOrEqual(5);
    for (const slide of HOWTO_SLIDES) {
      const path = join(process.cwd(), 'public', 'howto', `${slide.image}.jpg`);
      expect(existsSync(path), `missing howto image ${slide.image}`).toBe(true);
      expect(statSync(path).size, `${slide.image} too small`).toBeGreaterThan(5_000);
      expect(slide.title.length).toBeGreaterThan(3);
      expect(slide.body.length).toBeGreaterThan(30);
    }
  });
});
