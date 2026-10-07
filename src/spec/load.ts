import raw from '../../design_handoff_great_mortality/content/sim-spec.json';
import type { Spec } from './types';

export function loadSpec(): Spec {
  return raw as unknown as Spec;
}
