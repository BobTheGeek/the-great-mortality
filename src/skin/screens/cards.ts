import type { AppState } from '../../app/store';
import type { CodexEntry } from '../../spec/types';
import { esc } from '../../shell/dom';

export function cardsHtml(state: AppState, _codex: Map<string, CodexEntry>): string {
  const spec = state.spec;
  const p = state.persistent;
  const cards = spec.cards
    .map((card) => {
      const earned = p.cardsEarned.includes(card.id);
      if (!earned) {
        return `
          <div class="card card-locked" data-testid="card-${card.id}">
            <span class="lock-seal"></span>
            <span class="lock-text">Sealed · earned in play</span>
          </div>`;
      }
      const isNew = !p.cardsFlipped.includes(card.id);
      const stampCls = card.verdict === 'partly-true' ? 'stamp-partly' : 'stamp-busted';
      const stampText = card.verdict === 'partly-true' ? 'Partly true' : 'Busted';
      return `
        <div class="card" data-id="${card.id}" data-testid="card-${card.id}">
          <div class="card-inner">
            <button class="card-face card-front" data-action="card-flip">
              <span class="card-label">Myth · ${card.numeral}</span>
              <span class="woodcut">woodcut · ${esc(card.numeral)}</span>
              <span class="card-myth">${esc(card.myth)}</span>
              <span class="verdict-tag ${stampCls}">${stampText}</span>
            </button>
            <button class="card-face card-back" data-action="card-flip">
              <span class="card-label">Myth · ${card.numeral} · Verdict</span>
              <span class="stamp stamp-big ${stampCls}">${stampText}</span>
              <span class="card-story">${esc(card.story)}</span>
              <span class="card-how"><span class="label">How do we know?</span>${esc(card.howWeKnow)}</span>
            </button>
          </div>
          ${isNew ? '<span class="new-tag">New</span>' : ''}
        </div>`;
    })
    .join('');
  return `
    <div class="spread cards-spread">
      <section class="leaf leaf-card cards-leaf">
        <div class="cards-head">
          <h1 class="screen-heading">Myth-Buster Cards</h1>
          <span class="cards-hint">Tap a card to turn it over. Locked cards are earned in play.</span>
        </div>
        <div class="cards-grid" data-testid="cards-grid">${cards}</div>
      </section>
    </div>`;
}
