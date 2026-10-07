export interface Theme {
  frame: string;
  ink: string;
  inkDeep: string;
  mapInk: string;
  mapDropcap: string;
  lateOpacity: number;
  roadsInner: number;
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export function lerpHex(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * k);
  return rgbToHex(mix(ar, br), mix(ag, bg), mix(ab, bb));
}

export function darknessT(dead: number, pop: number): number {
  if (pop <= 0) return 0;
  return clamp01(dead / pop / 0.45);
}

export function themeFor(t: number): Theme {
  const k = clamp01(t);
  return {
    frame: lerpHex('#3a2a1c', '#1f150c', k),
    ink: lerpHex('#4a2f1d', '#2a1c10', k),
    inkDeep: '#2a1c10',
    mapInk: lerpHex('#4a2f1d', '#f1e6cf', k),
    mapDropcap: lerpHex('#8b2e2e', '#c96b5e', k),
    lateOpacity: k,
    roadsInner: k * 0.7,
  };
}

export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.style.setProperty('--frame-color', theme.frame);
  root.style.setProperty('--ledger-ink', theme.ink);
  root.style.setProperty('--ink-deep', theme.inkDeep);
  root.style.setProperty('--map-ink', theme.mapInk);
  root.style.setProperty('--map-dropcap', theme.mapDropcap);
  root.style.setProperty('--late-opacity', String(theme.lateOpacity));
  root.style.setProperty('--roads-inner-opacity', String(theme.roadsInner));
}
