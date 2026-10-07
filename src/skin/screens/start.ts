import { esc } from '../../shell/dom';
import type { AppState } from '../../app/store';
import type { CodexEntry } from '../../spec/types';

export function renderStart(root: HTMLElement, state: AppState, codex: Map<string, CodexEntry>): void {
  const t = state.spec.opening.titleCard;
  root.innerHTML = `
    <div class="app app-start">
      <main class="start-card" data-testid="start-screen">
        <p class="kicker">${esc(t.kicker)}</p>
        <h1>${esc(t.title)}</h1>
        <p class="sub">A working build: the opening scene and name picker arrive with Milestone 4.</p>
        <button class="primary" data-action="start-run" data-testid="start-run">Begin a stewardship</button>
      </main>
    </div>
  `;
}
