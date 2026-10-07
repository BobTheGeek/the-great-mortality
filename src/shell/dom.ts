import { parseMarkup } from '../spec/markup';
import type { CodexEntry } from '../spec/types';

export function esc(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderCopy(text: string, codex: Map<string, CodexEntry>): string {
  return parseMarkup(text)
    .map((token) => {
      if (token.kind === 'text') return esc(token.text);
      const display = token.display ?? codex.get(token.termId)?.term ?? token.termId;
      return `<span class="term" data-action="term" data-term="${esc(token.termId)}">${esc(display)}</span>`;
    })
    .join('');
}
