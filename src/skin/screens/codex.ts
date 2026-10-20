import type { AppState } from '../../app/store';
import type { CodexEntry } from '../../spec/types';
import { esc } from '../../shell/dom';

export function codexEntryHtml(term: CodexEntry, footer = ''): string {
  return `
    <h4 class="section-label">What it means here</h4>
    <p class="codex-meaning">${esc(term.meaning)}</p>
    <h4 class="section-label">Why it matters</h4>
    <p class="codex-why">${esc(term.why)}</p>
    ${
      term.then || term.now
        ? `<div class="then-now">
            <div><span class="label">Then · 1348</span><p>${esc(term.then ?? '')}</p></div>
            <div><span class="label">Now</span><p>${esc(term.now ?? '')}</p></div>
          </div>`
        : ''
    }
    ${footer}`;
}

export function codexHtml(state: AppState): string {
  const spec = state.spec;
  const p = state.persistent;
  const seenCount = p.codexSeen.length;
  const total = spec.codex.length;
  const current =
    spec.codex.find((c) => c.id === state.codexTerm && p.codexSeen.includes(c.id)) ??
    spec.codex.find((c) => p.codexSeen.includes(c.id)) ??
    null;

  const tiles = spec.codex
    .map((term) => {
      const seen = p.codexSeen.includes(term.id);
      if (!seen) {
        return `<button class="term-tile tile-unseen" data-action="codex-select" data-id="${term.id}" aria-disabled="true"><span class="silhouette"></span></button>`;
      }
      const isNew = !p.codexRead.includes(term.id);
      return `
        <button class="term-tile ${isNew ? 'tile-new' : 'tile-seen'} ${current?.id === term.id ? 'tile-current' : ''}" data-action="codex-select" data-id="${term.id}" data-testid="codex-tile-${term.id}">
          ${esc(term.term)}
          ${isNew ? '<span class="new-tag">New</span>' : ''}
        </button>`;
    })
    .join('');

  const chronicleLink = current
    ? spec.chronicles.find(
        (c) => p.chroniclesOpened.includes(c.id) && c.body.includes(`[[${current.id}`),
      )
    : undefined;

  const entry = current
    ? `
      <div class="codex-head">
        <p class="label">Codex · ${esc(current.pos.toUpperCase())}</p>
        <h2 class="codex-term">${esc(current.term)}</h2>
      </div>
      ${codexEntryHtml(
        current,
        `<footer class="codex-links">
          ${
            chronicleLink
              ? `<button class="quiet" data-action="nav" data-target="chronicles" data-chronicle="${chronicleLink.id}">Read the chronicle: ${esc(chronicleLink.title)}</button>`
              : ''
          }
          <button class="quiet" data-action="nav" data-target="board">See it on the Evidence Board</button>
        </footer>
        <p class="codex-seen">Added to your Codex · ${seenCount} of ${total} terms seen</p>`,
      )}`
    : '<p class="empty">One word so far: yours.</p>';

  return `
    <div class="spread codex-spread">
      <section class="leaf leaf-left codex-left">
        <div class="codex-grid" data-testid="codex-grid">${tiles}</div>
        <p class="codex-foot">Silhouetted terms appear as you meet them in play. ${
          total - seenCount
        } remain.</p>
      </section>
      <div class="spine"></div>
      <section class="leaf leaf-right codex-right" data-testid="codex-entry">${entry}</section>
    </div>`;
}
