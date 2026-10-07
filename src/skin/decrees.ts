import type { RunState } from '../engine/types';
import type { Spec } from '../spec/types';

export interface DecreeRow {
  id: string;
  name: string;
  description: string;
  cost: number;
  target: string;
  kind: string;
  state: 'idle' | 'selected' | 'active' | 'unaffordable' | 'destructive';
  activeCount: number;
  needsTown: boolean;
}

const SELECTED_DESCRIPTION = 'Now tap a town on the map.';
const ACTIVE_DESCRIPTION = 'In force · tap to lift';

function activeCountFor(run: RunState, id: string): number {
  switch (id) {
    case 'hold-ships':
      return run.shipsHeld ? 1 : 0;
    case 'close-port':
      return run.portClosed ? 1 : 0;
    case 'close-bathhouses':
      return run.bathhousesClosed ? 1 : 0;
    case 'seal-roads':
      return Object.values(run.towns).filter((t) => t.sealed).length;
    default:
      return 0;
  }
}

export function deriveDecreeRow(
  spec: Spec,
  run: RunState,
  id: string,
  selectedDecree: string | null,
  townKnown = false,
): DecreeRow {
  const d = spec.decrees.find((x) => x.id === id)!;
  const base: DecreeRow = {
    id: d.id,
    name: d.name,
    description: d.description,
    cost: d.cost,
    target: d.target,
    kind: d.kind,
    state: 'idle',
    activeCount: 0,
    needsTown: d.target === 'town' && !townKnown,
  };
  if (d.kind === 'ends-run') return { ...base, state: 'destructive' };
  const activeCount = activeCountFor(run, id);
  if (activeCount > 0) {
    return { ...base, state: 'active', activeCount, description: ACTIVE_DESCRIPTION };
  }
  if (selectedDecree === id && d.target === 'town') {
    return { ...base, state: 'selected', needsTown: true, description: SELECTED_DESCRIPTION };
  }
  if (run.treasury < d.cost) {
    return { ...base, state: 'unaffordable', description: `Not enough florins · needs ${d.cost}` };
  }
  return base;
}
