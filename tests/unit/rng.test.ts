import { expect, test } from 'vitest';
import { createRng } from '../../src/engine/rng';

function referenceRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('matches the reference mulberry32 sequence for many seeds', () => {
  for (const seed of [0, 1, 42, 123456789, 0xffffffff, 0x7fffffff]) {
    const mine = createRng(seed);
    const ref = referenceRng(seed);
    for (let i = 0; i < 1000; i++) {
      expect(mine.next(), `seed ${seed}, draw ${i}`).toBe(ref());
    }
  }
});

test('the state after some draws reproduces the continuation exactly', () => {
  const a = createRng(7);
  a.next();
  a.next();
  a.next();
  const snapshot = a.state;
  const b = createRng(1);
  b.state = snapshot;
  for (let i = 0; i < 100; i++) {
    expect(b.next()).toBe(a.next());
  }
});
