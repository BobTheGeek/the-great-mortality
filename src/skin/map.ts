import mapSvgRaw from '../../design_handoff_great_mortality/assets/map-region.svg?raw';
import type { RunState, TownState } from '../engine/types';
import type { Spec } from '../spec/types';
import { calendarMonth, seasonOf } from './calendar';
import { deriveTownState, townStatusText } from './town-state';

export interface LensView {
  open: boolean;
  layers: { rats: boolean; fleas: boolean; forms: boolean };
}

export interface MapUpdate {
  spec: Spec;
  run: RunState;
  selectedDecree: string | null;
  focusTown: string | null;
  lens: LensView;
}

export interface MapController {
  update(u: MapUpdate): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function translateOf(g: SVGGElement): [number, number] {
  const match = /translate\(([\d.]+)[ ,]([\d.]+)\)/.exec(g.getAttribute('transform') ?? '');
  return [Number(match?.[1] ?? 0), Number(match?.[2] ?? 0)];
}

interface TownRefs {
  g: SVGGElement;
  flag: SVGUseElement;
  cross: SVGUseElement | null;
  status: SVGTextElement;
  shadow: SVGCircleElement | null;
}

export function createMapController(host: HTMLElement): MapController {
  host.innerHTML = mapSvgRaw;
  const svg = host.querySelector('svg')!;
  svg.classList.add('map-svg');
  svg.setAttribute('viewBox', '130 0 1100 820');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-label', 'Map of the six towns');

  const towns = new Map<string, TownRefs>();

  svg.querySelectorAll<SVGGElement>('#layer-towns > g').forEach((g) => {
    const id = g.id.replace('town-', '');
    const [x, y] = translateOf(g);
    let shadow: SVGCircleElement | null = null;
    svg.querySelectorAll<SVGCircleElement>('#layer-death-shadow circle').forEach((circle) => {
      if (Number(circle.getAttribute('cx')) === x && Number(circle.getAttribute('cy')) === y) {
        shadow = circle;
      }
    });
    towns.set(id, {
      g,
      flag: g.querySelector<SVGUseElement>('use[href="#overlay-decree-flag"]')!,
      cross: g.querySelector<SVGUseElement>('use[href="#overlay-road-cross"]'),
      status: g.querySelector<SVGTextElement>('.status')!,
      shadow,
    });
  });

  const layerRoutes = svg.querySelector('#layer-routes')!;
  const seaLane = svg.querySelector('#sea-lane')!;
  const chain = document.createElementNS(SVG_NS, 'path');
  chain.setAttribute('id', 'port-chain');
  chain.setAttribute('d', seaLane.getAttribute('d') ?? '');
  chain.setAttribute('fill', 'none');
  chain.setAttribute('stroke', '#8b2e2e');
  chain.setAttribute('stroke-width', '4');
  chain.setAttribute('stroke-dasharray', '7 5');
  chain.setAttribute('stroke-linecap', 'round');
  chain.style.opacity = '0';
  layerRoutes.appendChild(chain);

  // Lens overlay: one rat colony circle per town, and the galley landing ring.
  const lensGroup = svg.querySelector<SVGGElement>('#layer-lens')!;
  const ratLayer = svg.querySelector<SVGGElement>('#lens-rats')!;
  ratLayer.innerHTML = '';
  const ratCircles = new Map<string, SVGCircleElement>();
  towns.forEach(({ g }, id) => {
    const [x, y] = translateOf(g);
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(x));
    circle.setAttribute('cy', String(y));
    circle.setAttribute('fill', 'url(#rat-stipple)');
    circle.setAttribute('stroke', '#4a2f1d');
    circle.setAttribute('stroke-width', '1.5');
    circle.setAttribute('stroke-dasharray', '4 4');
    ratLayer.appendChild(circle);
    ratCircles.set(id, circle);
  });
  const landingRing = document.createElementNS(SVG_NS, 'circle');
  landingRing.setAttribute('cx', '300');
  landingRing.setAttribute('cy', '660');
  landingRing.setAttribute('r', '42');
  landingRing.setAttribute('fill', 'none');
  landingRing.setAttribute('stroke', '#8b2e2e');
  landingRing.setAttribute('stroke-width', '3');
  lensGroup.appendChild(landingRing);
  const pneumonic = svg.querySelector<SVGGElement>('#lens-pneumonic')!;
  const fleas = svg.querySelector<SVGGElement>('#lens-fleas')!;
  const spared = svg.querySelector<SVGCircleElement>('#lens-spared')!;

  // The compass hides the dev sheet behind seven quick taps. Nudged left of
  // its design spot (1100,60) so the slice crop never takes it off-screen at
  // the reference landscape size.
  const compass = svg.querySelector<SVGGElement>('#compass');
  if (compass) {
    compass.setAttribute('transform', 'translate(1035 70)');
    compass.setAttribute('data-action', 'dev-tap');
    compass.setAttribute('data-testid', 'compass');
    const hit = document.createElementNS(SVG_NS, 'circle');
    hit.setAttribute('r', '40');
    hit.setAttribute('fill', 'transparent');
    compass.appendChild(hit);
  }

  const focusRing = document.createElementNS(SVG_NS, 'circle');
  focusRing.setAttribute('r', '64');
  focusRing.setAttribute('fill', 'none');
  focusRing.setAttribute('stroke', '#b8902e');
  focusRing.setAttribute('stroke-width', '4');
  focusRing.style.opacity = '0';
  let focusHome: SVGGElement | null = null;

  towns.forEach(({ g }) => {
    const shutters = document.createElementNS(SVG_NS, 'g');
    shutters.setAttribute('class', 'shutters');
    const upper = document.createElementNS(SVG_NS, 'rect');
    upper.setAttribute('x', '-34');
    upper.setAttribute('y', '-8');
    upper.setAttribute('width', '68');
    upper.setAttribute('height', '6');
    upper.setAttribute('rx', '1');
    const lower = document.createElementNS(SVG_NS, 'rect');
    lower.setAttribute('x', '-34');
    lower.setAttribute('y', '2');
    lower.setAttribute('width', '68');
    lower.setAttribute('height', '6');
    lower.setAttribute('rx', '1');
    shutters.appendChild(upper);
    shutters.appendChild(lower);
    g.querySelector('.disc')?.after(shutters);
  });

  function update(u: MapUpdate): void {
    const cal = calendarMonth(u.spec.sim.startCalendarMonth, u.run.month);
    const season = seasonOf(cal);
    svg.querySelectorAll<SVGGElement>('#layer-season > g').forEach((g) => {
      g.style.opacity = g.id === `season-${season}` ? '1' : '0';
    });
    const seasonLabel = svg.querySelector('#season-label');
    if (seasonLabel) {
      seasonLabel.textContent = season[0]!.toUpperCase() + season.slice(1);
    }

    towns.forEach((refs, id) => {
      const t = u.run.towns[id] as TownState;
      const state = deriveTownState(t);
      refs.g.dataset.state = state;
      const specTown = u.spec.towns.find((x) => x.id === id)!;
      refs.status.textContent = townStatusText(specTown.label, specTown.pop, state);
      const isPort = id === u.spec.sim.portTown;
      const showFlag = t.sealed || t.clean || (isPort && (u.run.shipsHeld || u.run.portClosed));
      refs.flag.style.opacity = showFlag ? '1' : '0';
      if (refs.cross) refs.cross.style.opacity = t.sealed ? '1' : '0';
      if (refs.shadow) {
        refs.shadow.style.opacity = String(Math.min(1, t.D / t.pop / 0.4) * 0.9);
      }
      const eligible =
        !u.selectedDecree ||
        (u.selectedDecree === 'seal-roads'
          ? !t.sealed
          : u.selectedDecree === 'clean-streets'
            ? !t.clean
            : true);
      refs.g.classList.toggle('pulse', Boolean(u.selectedDecree) && eligible);
    });

    const galley = svg.querySelector<SVGGElement>('#marker-galley-offshore');
    if (galley) {
      galley.style.opacity = u.run.shipsHeld && !u.run.portClosed ? '1' : '0';
    }
    chain.style.opacity = u.run.portClosed ? '1' : '0';

    svg.classList.toggle('town-focus', Boolean(u.focusTown));
    towns.forEach((refs, id) => {
      refs.g.classList.toggle('selected', id === u.focusTown);
    });
    const focusTarget = u.focusTown ? towns.get(u.focusTown)?.g ?? null : null;
    if (focusTarget) {
      if (focusHome !== focusTarget) {
        focusTarget.appendChild(focusRing);
        focusHome = focusTarget;
      }
      focusRing.style.opacity = '1';
    } else {
      focusRing.style.opacity = '0';
    }

    const lens = u.lens;
    lensGroup.style.opacity = lens.open ? '1' : '0';
    svg.classList.toggle('lens-open', lens.open);
    if (lens.open) {
      towns.forEach(({ g }, id) => {
        const t = u.run.towns[id]!;
        const circle = ratCircles.get(id)!;
        const initial = u.spec.sim.ratDensity[t.type] ?? Math.max(1, t.ratS + t.ratI);
        const frac = Math.max(0, Math.min(1, (t.ratS + t.ratI) / Math.max(1, initial)));
        circle.setAttribute('r', String(34 + 86 * frac));
        circle.style.opacity = frac <= 0.02 ? '0' : String(0.25 + 0.6 * frac);
      });
      ratLayer.style.display = lens.layers.rats ? '' : 'none';
      fleas.style.display = lens.layers.fleas ? '' : 'none';
      pneumonic.style.display = lens.layers.forms ? '' : 'none';
      let breath: { x: number; y: number; p: number } | null = null;
      let totalP = 0;
      towns.forEach(({ g }, id) => {
        const t = u.run.towns[id]!;
        totalP += t.P;
        const [x, y] = translateOf(g);
        if (t.P > 0 && (!breath || t.P > breath.p)) breath = { x, y, p: t.P };
      });
      if (breath) {
        const spot = breath as { x: number; y: number };
        pneumonic.setAttribute('transform', `translate(${spot.x - 680} ${spot.y - 388})`);
      }
      pneumonic.style.opacity = String(Math.max(0, Math.min(1, totalP / 40)));
      const fontenera = u.run.towns[u.spec.sim.isolatedTown];
      spared.style.display = fontenera && fontenera.D === 0 ? '' : 'none';
    }
  }

  return { update };
}
