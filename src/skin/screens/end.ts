import { endingView, reckoningView } from '../../app/endings';
import type { AppState } from '../../app/store';
import { esc } from '../../shell/dom';

function mysterySolvedCount(state: AppState): { solved: number; total: number } {
  return {
    solved: state.persistent.mysterySolved.length,
    total: state.spec.mystery.questions.length,
  };
}

function discs(state: AppState): string {
  return state.spec.mystery.questions
    .map(
      (q) =>
        `<span class="mystery-disc ${state.persistent.mysterySolved.includes(q.id) ? 'solved' : 'open'}">${q.numeral}</span>`,
    )
    .join('');
}

export function renderEnding(root: HTMLElement, state: AppState): void {
  const run = state.run;
  if (!run) return;
  const view = endingView(state.spec, state.persistent, run);
  root.innerHTML = `
    <div class="app end-screen end-${view.kind}" data-testid="end-screen">
      <div class="ending-ground">
        <div class="ending-panel">
          <p class="label">${esc(view.label)}</p>
          <h1 class="ending-title">${esc(view.steward)} <span class="epithet-word">${esc(view.epithetWord)}</span></h1>
          <p class="ending-body">${esc(view.body)}</p>
          <div class="ending-stats">
            ${
              view.kind === 'overthrown'
                ? `<div class="ending-stat"><span class="label">Unrest</span><span class="stat">${view.unrest}</span></div>
                   <div class="ending-stat"><span class="label">Surviving so far</span><span class="stat">${view.survivalPct}%</span></div>`
                : `<div class="ending-stat ending-stat-wide"><span class="label">The region, without you</span><span class="stat">${esc(view.fledPctLabel)}</span></div>`
            }
            <div class="ending-stat"><span class="label">The mystery</span><span class="stat">${view.mysterySolved} of ${view.mysteryTotal}</span></div>
          </div>
          <p class="ending-footnote">${esc(view.footnote)}</p>
          <div class="ending-actions">
            <button class="primary" data-action="ending-again" data-testid="ending-again">Begin again</button>
            <button class="quiet" data-action="ending-reckoning" data-testid="ending-reckoning">See the reckoning</button>
          </div>
        </div>
      </div>
    </div>
    <div class="sheet-host" data-testid="sheet-host"></div>`;
}

function newThisRun(counts: { chronicles: number; cards: number; codex: number }): string {
  const parts: string[] = [];
  if (counts.chronicles) parts.push(`${counts.chronicles} chronicle${counts.chronicles === 1 ? '' : 's'}`);
  if (counts.cards) parts.push(`${counts.cards} card${counts.cards === 1 ? '' : 's'}`);
  if (counts.codex) parts.push(`${counts.codex} codex term${counts.codex === 1 ? '' : 's'}`);
  return parts.length ? parts.join(', ') : 'none';
}

export function renderReckoning(root: HTMLElement, state: AppState): void {
  const run = state.run;
  if (!run) return;
  const view = reckoningView(state.spec, state.persistent, run);
  const mystery = mysterySolvedCount(state);
  const bars = view.towns
    .map(
      (t) => `
      <li class="reckon-town ${t.spared ? 'spared' : ''}">
        <span class="reckon-town-name">${esc(t.name)}</span>
        <span class="reckon-track"><span class="reckon-fill" style="width:${t.pct}%"></span><span class="reckon-line"></span></span>
        <span class="reckon-pct">${t.pct}%</span>
      </li>`,
    )
    .join('');
  const chips = view.epithetNames
    .map(
      (e) =>
        `<span class="epithet-chip ${e.earned ? 'earned' : ''} ${e.id === view.epithet.id ? 'current' : ''}">${esc(e.name)}</span>`,
    )
    .join('');
  root.innerHTML = `
    <div class="app reckon-screen" data-testid="reckoning">
      <div class="screen">
        <div class="reckon-spread">
          <section class="leaf reckon-left">
            <p class="label">${esc(view.kicker.toUpperCase())}</p>
            <h2 class="reckon-title"><span class="dropcap">T</span>he reckoning</h2>
            <div class="reckon-boxes">
              <div class="reckon-box">
                <span class="label">Your region survived</span>
                <span class="reckon-big">${view.survivalPct}%</span>
                <span class="reckon-souls">${esc(view.soulsLabel)}</span>
              </div>
              <div class="reckon-box dashed">
                <span class="label">${esc(state.spec.endings.normal.benchmarkLabel)}</span>
                <span class="reckon-big">${esc(state.spec.endings.normal.benchmarkValue)}</span>
                <span class="reckon-souls">${esc(state.spec.endings.normal.benchmarkCaption)}</span>
              </div>
            </div>
            <h3 class="section-label">Town by town · surviving</h3>
            <ul class="reckon-towns">${bars}</ul>
            <p class="reckon-note">Red line: the historical loss.</p>
            <div class="reckon-mystery">
              <span class="label">The mystery</span>
              <span class="mystery-discs">${discs(state)}</span>
              <span class="reckon-mystery-count">${mystery.solved} of ${mystery.total} solved${
                view.mystery.newSolved ? ` · +${view.mystery.newSolved} this run` : ''
              }</span>
              <span class="reckon-new">New this run: ${esc(newThisRun(view.newCounts))}.</span>
            </div>
          </section>
          <div class="spine"></div>
          <section class="leaf reckon-right">
            <p class="label">Thus the chronicle names him</p>
            <div class="epithet-plaque">
              <span class="epithet-name">${esc(run.steward)}</span>
              <span class="epithet-value">${esc(view.epithet.name)}</span>
              <span class="epithet-citation">${esc(view.epithet.citation)}</span>
            </div>
            <h3 class="section-label">Epithets earned · ${view.epithetsEarned} of ${view.epithetTotal}</h3>
            <div class="epithet-chips">${chips}</div>
            <div class="reckon-actions">
              <button class="primary" data-action="reckon-again" data-testid="reckon-again">Play again</button>
              <button class="quiet" data-action="reckon-chronicle" data-testid="reckon-chronicle">Read the chronicle: The Great Mortality</button>
            </div>
          </section>
        </div>
      </div>
    </div>
    <div class="sheet-host" data-testid="sheet-host"></div>`;
}
