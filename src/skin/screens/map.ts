import type { AppState } from '../../app/store';
import { living } from '../../engine/engine';
import type { TownState } from '../../engine/types';
import { latestForTown } from '../../app/journal';
import type { CodexEntry } from '../../spec/types';
import { esc, renderCopy } from '../../shell/dom';
import { calendarMonth, calendarYear, monthName, monthTag, startYearFromSpec } from '../calendar';
import { deriveDecreeRow } from '../decrees';
import { unrestAlarm, unrestBandWord } from '../unrest';
import { deriveTownState } from '../town-state';

const NAV_TILES: { id: string; label: string }[] = [
  { id: 'evidence', label: 'Evidence' },
  { id: 'codex', label: 'Codex' },
  { id: 'chronicles', label: 'Chronicles' },
  { id: 'cards', label: 'Cards' },
];

export function mountMapShell(root: HTMLElement): void {
  if (root.querySelector('[data-testid="frame"]')) return;
  root.innerHTML = `
    <div class="app" data-testid="frame">
      <div class="spread">
        <section class="leaf leaf-hero" data-testid="leaf-hero">
          <div class="map-host" data-testid="map-host"></div>
          <div class="map-heading">
            <h1 data-testid="map-heading"></h1>
            <p class="map-subheading" data-testid="map-subheading"></p>
          </div>
          <button class="icon-btn pause-btn" data-action="pause" data-testid="pause" aria-label="Pause">☰</button>
        </section>
        <div class="spine"></div>
        <section class="leaf leaf-ledger" data-testid="leaf-ledger"></section>
      </div>
    </div>
    <div class="sheet-host" data-testid="sheet-host"></div>
  `;
}

export function renderHeading(root: HTMLElement, state: AppState): void {
  const run = state.run!;
  const spec = state.spec;
  const cal = calendarMonth(spec.sim.startCalendarMonth, run.month);
  const year = calendarYear(spec.sim.startCalendarMonth, run.month, startYearFromSpec(spec));
  const flavor = spec.monthFlavors?.[cal] ?? monthName(cal);
  const heading = root.querySelector('[data-testid="map-heading"]');
  const sub = root.querySelector('[data-testid="map-subheading"]');
  if (heading) heading.textContent = `${monthName(cal)} ${year}`;
  if (sub) sub.textContent = `${flavor} · month ${run.month + 1} of ${spec.sim.months}`;
}

function statusLine(state: AppState, t: TownState): string {
  const visual = deriveTownState(t);
  const phrase = {
    healthy: 'No sickness',
    rumors: 'Rumors of sickness',
    spreading: 'Plague spreading',
    ravaged: 'Plague ravaging the town',
    burned: 'The town is burned out',
  }[visual];
  if (t.monthlyDeaths.length >= 2) {
    const last = t.monthlyDeaths[t.monthlyDeaths.length - 1] ?? 0;
    const prev = t.monthlyDeaths[t.monthlyDeaths.length - 2] ?? 0;
    if (last > prev) return `${phrase} · worse than last month`;
    if (last < prev) return `${phrase} · better than last month`;
    return `${phrase} · much as last month`;
  }
  return phrase;
}

function townChipsHtml(state: AppState, t: TownState): string {
  const spec = state.spec;
  const run = state.run!;
  const chips: string[] = [];
  const isPort = t.id === spec.sim.portTown;
  if (t.sealed) chips.push(chip(spec.decrees.find((d) => d.id === 'seal-roads')!.name, true));
  if (isPort && run.shipsHeld) chips.push(chip(spec.decrees.find((d) => d.id === 'hold-ships')!.name, true));
  if (isPort && run.portClosed) chips.push(chip(spec.decrees.find((d) => d.id === 'close-port')!.name, true));
  const seen = new Set(['seal-roads', 'hold-ships', 'close-port']);
  const past = [...t.decreesHistory].reverse().filter((entry) => !seen.has(entry.id));
  const uniquePast: string[] = [];
  past.forEach((entry) => {
    if (!uniquePast.includes(entry.id)) uniquePast.push(entry.id);
  });
  uniquePast.forEach((id) => {
    const decree = spec.decrees.find((d) => d.id === id);
    if (decree) chips.push(chip(decree.name, false));
  });
  return chips.join('');
}

function chip(label: string, active: boolean): string {
  return `<span class="chip ${active ? 'chip-active' : 'chip-past'}">${
    active ? '<span class="chip-dot"></span>' : ''
  }${esc(label)}</span>`;
}

function townDetailHtml(state: AppState, codex: Map<string, CodexEntry>): string {
  const spec = state.spec;
  const run = state.run!;
  const t = run.towns[state.selectedTown!]!;
  const specTown = spec.towns.find((x) => x.id === t.id)!;
  const deaths = t.monthlyDeaths;
  const max = Math.max(1, ...deaths);
  const bars = deaths
    .map((value, index) => {
      const pct = Math.max(2, (value / max) * 100);
      const hatched = value >= Math.max(10, max * 0.3);
      const month = monthTag(calendarMonth(spec.sim.startCalendarMonth, index));
      return `<div class="bar-slot"><div class="bar ${hatched ? 'bar-hatch' : 'bar-solid'}" style="height:${pct}%"></div><span class="bar-label">${month}</span></div>`;
    })
    .join('');
  const lately = latestForTown(spec, state.journal, t.id)
    .map(
      (line) =>
        `<li><span class="lately-tag">${line.monthTag}</span><span class="lately-text">${renderCopy(
          line.text,
          codex,
        )}</span></li>`,
    )
    .join('');
  return `
    <div class="town-detail" data-testid="town-detail">
      <div class="town-head">
        <div>
          <p class="label">${esc(specTown.label.toUpperCase())} · FOUNDED ${specTown.founded}</p>
          <h2 class="town-name">${esc(specTown.name)}</h2>
          <p class="town-status">${esc(statusLine(state, t))}</p>
        </div>
        <button class="icon-btn" data-action="back-to-ledger" aria-label="Close">✕</button>
      </div>
      <div class="town-stats">
        <div><span class="label">Living</span><span class="stat">${Math.round(living(t)).toLocaleString('en-US')}</span></div>
        <div><span class="label">Sick abed</span><span class="stat">${Math.round(t.I + t.P).toLocaleString('en-US')}</span></div>
        <div><span class="label">Buried</span><span class="stat">${Math.round(t.D).toLocaleString('en-US')}</span></div>
      </div>
      <h3 class="section-label">Burials by month</h3>
      <div class="bars">${bars || '<p class="muted">No burials yet.</p>'}</div>
      <h3 class="section-label">Decrees in force here</h3>
      <div class="chips">${townChipsHtml(state, t) || '<p class="muted">None yet.</p>'}</div>
      <h3 class="section-label">Lately</h3>
      <ul class="lately">${lately || '<li class="muted">Nothing to report.</li>'}</ul>
      <div class="town-actions">
        <button class="quiet strong" data-action="issue-here">Issue a decree here</button>
        <button class="quiet" data-action="back-to-ledger" data-testid="back-to-ledger">Back to ledger</button>
      </div>
    </div>
  `;
}

function decreeRowHtml(state: AppState, id: string): string {
  const spec = state.spec;
  const run = state.run!;
  const row = deriveDecreeRow(spec, run, id, state.selectedDecree, state.selectedTown !== null);
  const cost =
    row.kind === 'ends-run'
      ? ''
      : row.state === 'active'
        ? `<span class="decree-disc"></span><span class="decree-active-label">${
            row.activeCount > 1 ? `${row.activeCount} ACTIVE` : 'ACTIVE'
          }</span>`
        : `<span class="decree-cost ${row.state === 'unaffordable' ? 'struck' : ''}">${row.cost} ƒ</span>`;
  return `
    <div class="decree-row decree-${row.state}" data-action="decree" data-id="${row.id}" data-testid="decree-${row.id}">
      <div class="decree-main">
        <span class="decree-name">${esc(row.name)}</span>
        <span class="decree-desc">${esc(row.description)}</span>
      </div>
      ${cost}
    </div>
  `;
}

function navHtml(state: AppState): string {
  const clues = state.persistent.cluesFound.length;
  const tiles = NAV_TILES.map(
    (tile) => `
      <button class="nav-tile" data-action="nav" data-target="${tile.id}" aria-disabled="true">
        ${esc(tile.label)}
        ${tile.id === 'evidence' && clues > 0 ? `<span class="badge">${clues}</span>` : ''}
      </button>`,
  ).join('');
  const lens = `
    <button class="nav-tile nav-lens" data-action="nav" data-target="lens" aria-disabled="true">
      Lens<span class="seal-dot"></span>
    </button>`;
  return `<div class="ledger-nav">${tiles}${lens}</div>`;
}

export function renderLedger(root: HTMLElement, state: AppState, codex: Map<string, CodexEntry>): void {
  const host = root.querySelector('[data-testid="leaf-ledger"]');
  if (!host) return;
  if (state.ledger === 'town' && state.selectedTown) {
    host.innerHTML = townDetailHtml(state, codex);
    return;
  }
  const spec = state.spec;
  const run = state.run!;
  const unrest = Math.round(run.unrest);
  const word = unrestBandWord(spec, unrest);
  const alarm = unrestAlarm(unrest);
  const rows = spec.decrees.map((d) => decreeRowHtml(state, d.id)).join('');
  host.innerHTML = `
    <div class="ledger">
      <div class="hud">
        <div class="hud-treasury">
          <span class="label">Treasury</span>
          <span class="hud-number" data-testid="treasury">${Math.round(run.treasury).toLocaleString('en-US')} <em>fl.</em></span>
        </div>
        <div class="hud-decrees">
          <span class="label">Decrees left</span>
          <span class="slots" data-testid="decree-slots">
            ${Array.from({ length: spec.sim.decreesPerMonth })
              .map((_, index) => `<span class="slot ${index < run.decreesLeft ? 'slot-filled' : ''}"></span>`)
              .join('')}
            <span class="slot-text">${run.decreesLeft} of ${spec.sim.decreesPerMonth}</span>
          </span>
        </div>
        <div class="hud-unrest">
          <span class="unrest-head">
            <span class="label">Unrest</span>
            <span class="unrest-state ${alarm ? 'alarm' : ''}">
              <span data-testid="unrest-word">${esc(word)}</span> · <span data-testid="unrest-value">${unrest} of 100</span>
            </span>
          </span>
          <span class="meter">
            <span class="meter-fill" style="width:${unrest}%"></span>
            <span class="tick tick-25"></span><span class="tick tick-50"></span><span class="tick tick-75"></span>
          </span>
        </div>
      </div>
      <p class="decree-hint">Decrees of the Steward · tap one to issue</p>
      <div class="decree-list">${rows}</div>
      <div class="ledger-actions">
        ${navHtml(state)}
        <button class="primary end-month" data-action="end-month" data-testid="end-month" ${
          state.selectedDecree ? 'disabled' : ''
        }>End month</button>
      </div>
    </div>
  `;
}
