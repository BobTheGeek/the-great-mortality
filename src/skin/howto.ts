import type { AppState } from '../app/store';
import { esc } from '../shell/dom';

export interface HowToSlide {
  image: string;
  title: string;
  body: string;
}

export const HOWTO_SLIDES: HowToSlide[] = [
  {
    image: 'map',
    title: 'Your six towns',
    body: 'You are the steward of six towns on the Italian coast. The sickness arrives in November 1347 — keep your people alive for eighteen months, and find out what is killing them.',
  },
  {
    image: 'decrees',
    title: 'Issue decrees',
    body: 'Each month you may issue up to two decrees. Tap one to issue it — some act on the whole region, some ask you to tap a town. Toggles stay in force until you lift them, and lifting is free.',
  },
  {
    image: 'report',
    title: 'End the month',
    body: 'Tap End month when you are ready. The sickness spreads, and the report writes itself: burials by town, your treasury, and your unrest. If unrest ever reaches 100, you are overthrown.',
  },
  {
    image: 'board',
    title: 'Solve the mystery',
    body: 'Clues pin themselves to the Evidence Board as the months pass. Tap a question, choose a theory and argue it — when your clues prove an answer, it stays solved forever. All four solved unseals the Physician’s Lens.',
  },
  {
    image: 'cards',
    title: 'Study the world',
    body: 'The Codex explains hard words, the Chronicles hold the real history, and the Myth-Buster Cards break down what people get wrong. Progress in all of them carries across every stewardship.',
  },
  {
    image: 'advisor',
    title: 'Hear your advisors',
    body: 'The Physician, Priest, Astrologer and Merchant speak after most reports — and some offer to issue a decree for you. Advisors speak sincerely. Whether they are right is for you to find out.',
  },
];

export function howtoSheetHtml(state: AppState): string {
  if (state.sheet?.kind !== 'howto') return '';
  const slide = Math.max(0, Math.min(state.sheet.slide, HOWTO_SLIDES.length - 1));
  const current = HOWTO_SLIDES[slide]!;
  const last = slide === HOWTO_SLIDES.length - 1;
  const dots = HOWTO_SLIDES.map(
    (_, index) => `<span class="howto-dot ${index === slide ? 'current' : ''}"></span>`,
  ).join('');
  return `
    <div class="howto-ground" data-testid="sheet-howto">
      <div class="sheet sheet-howto" role="dialog" aria-modal="true">
        <header class="howto-head">
          <p class="label">How to play · ${slide + 1} of ${HOWTO_SLIDES.length}</p>
          <button class="icon-btn" data-action="howto-close" data-testid="howto-close" aria-label="Close">✕</button>
        </header>
        <span class="howto-img-box">
          <img class="howto-img" src="./howto/${current.image}.jpg" alt="" decoding="async" />
        </span>
        <h2 class="howto-title">${esc(current.title)}</h2>
        <p class="howto-body">${esc(current.body)}</p>
        <footer class="howto-foot">
          <span class="howto-dots">${dots}</span>
          <span class="howto-actions">
            ${slide > 0 ? '<button class="quiet" data-action="howto-back" data-testid="howto-back">Back</button>' : ''}
            ${
              last
                ? '<button class="primary" data-action="howto-close" data-testid="howto-start">Begin playing</button>'
                : '<button class="primary" data-action="howto-next" data-testid="howto-next">Next</button>'
            }
          </span>
        </footer>
      </div>
    </div>`;
}
