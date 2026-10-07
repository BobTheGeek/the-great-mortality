import type { TownState } from '../engine/types';

export type TownVisualState = 'healthy' | 'rumors' | 'spreading' | 'ravaged' | 'burned';

export function deriveTownState(
  t: Pick<TownState, 'pop' | 'I' | 'P' | 'D' | 'deadRatsSeen'>,
): TownVisualState {
  const share = t.pop > 0 ? t.D / t.pop : 0;
  if (share >= 0.5) return 'burned';
  if (share > 0.15) return 'ravaged';
  if (t.I + t.P > 0.5 || t.D > 0) return 'spreading';
  if (t.deadRatsSeen) return 'rumors';
  return 'healthy';
}

export function stateWord(state: TownVisualState): string {
  switch (state) {
    case 'healthy':
      return 'Healthy';
    case 'rumors':
      return 'Rumors';
    case 'spreading':
      return 'Spreading';
    case 'ravaged':
      return 'Ravaged';
    case 'burned':
      return 'Burned out';
  }
}

export function townStatusText(label: string, pop: number, state: TownVisualState): string {
  return `${label.toUpperCase()} · ${pop.toLocaleString('en-US')} · ${stateWord(state)}`;
}
