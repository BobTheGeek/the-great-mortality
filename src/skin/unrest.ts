import type { Spec } from '../spec/types';

export function unrestBandWord(spec: Spec, value: number): string {
  const v = Math.min(100, Math.max(0, value));
  for (const band of spec.unrestBands) {
    if (v >= band.min && v <= band.max) return band.word;
  }
  const last = spec.unrestBands[spec.unrestBands.length - 1];
  return last ? last.word : '';
}

export function unrestAlarm(value: number): boolean {
  return value >= 60;
}
