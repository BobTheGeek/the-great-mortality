import { hasHistory, nameChoices, saveSummary } from '../../app/opening';
import type { AppState } from '../../app/store';
import type { CodexEntry } from '../../spec/types';
import { esc, renderCopy } from '../../shell/dom';
import { isStandalone, shouldShowA2hs } from '../../shell/pwa';

function a2hsHtml(state: AppState): string {
  if (!shouldShowA2hs(isStandalone(), state.persistent)) return '';
  if (state.a2hsExpanded) {
    return `
      <div class="a2hs a2hs-expanded" data-testid="a2hs">
        <p class="a2hs-title">Put the ledger on your shelf</p>
        <p class="a2hs-body">Tap the Share button at the top of the screen (the ⍐ square), then choose “Add to Home Screen.”</p>
        <div class="a2hs-actions">
          <button class="primary ink" data-action="a2hs-done" data-testid="a2hs-done">Done</button>
        </div>
      </div>`;
  }
  return `
    <div class="a2hs" data-testid="a2hs">
      <p class="a2hs-title">Put the ledger on your shelf</p>
      <p class="a2hs-body">To play fullscreen and offline: tap Share ⍐ then Add to Home Screen.</p>
      ${
        state.a2hsWarn
          ? '<p class="a2hs-warn" data-testid="a2hs-warn">Progress made here won’t carry over to the home-screen app.</p>'
          : ''
      }
      <div class="a2hs-actions">
        <button class="primary ink" data-action="a2hs-show" data-testid="a2hs-show">Show me</button>
        <button class="quiet" data-action="a2hs-later" data-testid="a2hs-later">Later</button>
      </div>
      <span class="a2hs-pointer" aria-hidden="true"></span>
    </div>`;
}

function nightScene(dimmed: boolean): string {
  const galleys = [240, 500, 780]
    .map(
      (x, index) => `
        <g class="galley" transform="translate(${x} ${560 + index * 42})">
          <g class="galley-drift" style="--drift-delay:${index * 3.5}s">
            <path d="M-62 0 Q0 20 62 0 L50 15 Q0 32 -50 15 Z" fill="#0b0c10"></path>
            <path d="M0 0 V-58" stroke="#0b0c10" stroke-width="3"></path>
            <path d="M0 -58 L34 -40 L0 -46 Z" fill="#0b0c10"></path>
            <path d="M-34 8 L-34 22 M-17 12 L-17 26 M0 14 L0 28 M17 12 L17 26 M34 8 L34 22" stroke="#0b0c10" stroke-width="2.4" stroke-linecap="round"></path>
            <circle cx="${-10 + index * 8}" cy="-4" r="2.6" fill="#b8902e"></circle>
          </g>
        </g>`,
    )
    .join('');
  return `
    <svg class="night-scene ${dimmed ? 'night-dim' : ''}" viewBox="0 0 1180 820" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="sea-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-10)">
          <line x1="0" y1="0" x2="12" y2="0" stroke="#efe3c9" stroke-width="1.4" opacity="0.18"></line>
        </pattern>
      </defs>
      <circle cx="905" cy="138" r="58" fill="#f1e6cf" opacity="0.92"></circle>
      <circle cx="925" cy="126" r="54" fill="#1f2129" opacity="0.92"></circle>
      <path d="M0 470 V404 L34 404 L34 372 L62 372 L62 404 L120 404 L120 356 L150 356 L150 404 L214 404 L214 384 L262 384 L262 404 L318 404 L318 330 L340 330 L340 404 L420 404 L420 368 L470 368 L470 404 L528 404 L528 392 L590 392 L590 404 L648 404 L648 344 L676 344 L676 404 L744 404 L744 378 L800 378 L800 404 L860 404 L860 362 L900 362 L900 404 L968 404 L968 388 L1030 388 L1030 404 L1100 404 L1100 370 L1132 370 L1132 404 L1180 404 L1180 470 Z" fill="#0b0c10"></path>
      <line x1="0" y1="470" x2="1180" y2="470" stroke="#0b0c10" stroke-width="2"></line>
      <rect x="0" y="471" width="1180" height="349" fill="url(#sea-hatch)"></rect>
      <g class="galleys">${galleys}</g>
    </svg>`;
}

function progressDots(state: AppState): string {
  const total = state.spec.opening.narration.length;
  return `<span class="open-dots" data-testid="opening-dots">${Array.from({ length: total }, (_, index) => `<span class="open-dot ${index < state.openingLine ? 'filled' : ''}"></span>`).join('')}</span>`;
}

function mysteryDiscs(state: AppState): string {
  const solved = state.persistent.mysterySolved;
  return state.spec.mystery.questions
    .map((q) => `<span class="mystery-disc ${solved.includes(q.id) ? 'solved' : 'open'}">${q.numeral}</span>`)
    .join('');
}

function returnVisit(state: AppState): string {
  const spec = state.spec;
  const t = spec.opening.titleCard;
  const split = t.title.indexOf('. ');
  const lead = split === -1 ? t.title : t.title.slice(0, split + 1);
  const tail = split === -1 ? '' : t.title.slice(split + 2);
  const solved = state.persistent.mysterySolved.length;
  const run = state.run;
  return `
    <div class="app app-start" data-testid="start-screen">
      ${nightScene(true)}
      ${a2hsHtml(state)}
      <main class="return-visit" data-testid="return-visit">
        <header class="return-head">
          <p class="kicker">${esc(t.kicker.toUpperCase())}</p>
          <h1>${esc(lead)}</h1>
          <p class="return-sub">${esc(tail)}</p>
        </header>
        <div class="return-actions">
          ${
            run
              ? `<button class="continue-sheet" data-action="continue-run" data-testid="continue-run">
                   <span class="continue-text"><strong>Continue</strong><em>${esc(saveSummary(spec, run))}</em></span>
                   <span class="continue-seal"></span>
                 </button>`
              : ''
          }
          <button class="new-game" data-action="new-game" data-testid="new-game">New game</button>
        </div>
        <div class="mystery-row">
          <span class="label">The mystery</span>
          <span class="mystery-count">${solved} of ${spec.mystery.questions.length} questions solved</span>
          <span class="mystery-note">Progress carries across every stewardship.</span>
          <span class="mystery-discs">${mysteryDiscs(state)}</span>
        </div>
        <footer class="return-foot">
          <span>Epithets earned: ${state.persistent.epithetsEarned.length} · Cards: ${state.persistent.cardsEarned.length} of ${spec.cards.length} · Chronicles: ${state.persistent.chroniclesOpened.length} of ${spec.chronicles.length} ·</span>
          <button class="foot-link" data-action="pause" data-testid="start-settings">Settings</button>
        </footer>
      </main>
    </div>
    <div class="sheet-host" data-testid="sheet-host"></div>`;
}

function titleCard(state: AppState, codex: Map<string, CodexEntry>): string {
  const t = state.spec.opening.titleCard;
  const names = nameChoices(state.spec, state.namePage);
  return `
    <div class="app app-start" data-testid="start-screen">
      ${nightScene(false)}
      ${a2hsHtml(state)}
      <main class="title-card" data-testid="opening-title">
        <p class="kicker">${esc(t.kicker.toUpperCase())}</p>
        <h1><span class="dropcap">${esc(t.title.slice(0, 1))}</span>${esc(t.title.slice(1))}</h1>
        <p class="title-body">${renderCopy(t.body, codex)}</p>
        <div class="name-grid">
          ${names
            .map(
              (name, index) =>
                `<button class="name-btn" data-action="name-pick" data-name="${esc(name)}" data-testid="name-${index}">${esc(name)}</button>`,
            )
            .join('')}
          <button class="reroll" data-action="name-reroll" data-testid="name-reroll" aria-label="Different names">↻</button>
        </div>
      </main>
    </div>
    <div class="sheet-host" data-testid="sheet-host"></div>`;
}

function openingLines(state: AppState): string {
  const narration = state.spec.opening.narration;
  const line = Math.min(state.openingLine, narration.length - 1);
  const next = state.openingLine + 1 < narration.length ? narration[state.openingLine + 1]! : '';
  return `
    <div class="app app-start" data-testid="start-screen">
      <button class="opening-tap" data-action="open-next" data-testid="opening-next" aria-label="Continue">
        ${nightScene(false)}
        <span class="open-label">${esc(state.spec.opening.label.toUpperCase())}</span>
        <span class="open-hint">Tap to continue · <span class="open-skip" data-action="open-skip" data-testid="opening-skip">Skip</span></span>
        ${progressDots(state)}
        <span class="open-lines">
          <span class="open-line current" data-testid="opening-line">${esc(narration[line] ?? '')}</span>
          ${next ? `<span class="open-line next">${esc(next)}</span>` : ''}
        </span>
      </button>
      ${a2hsHtml(state)}
    </div>
    <div class="sheet-host" data-testid="sheet-host"></div>`;
}

export function renderStart(root: HTMLElement, state: AppState, codex: Map<string, CodexEntry>): void {
  if (!state.openingStarted && hasHistory(state.spec, state.persistent, state.run)) {
    root.innerHTML = returnVisit(state);
    return;
  }
  root.innerHTML = state.openingTitle ? titleCard(state, codex) : openingLines(state);
}
