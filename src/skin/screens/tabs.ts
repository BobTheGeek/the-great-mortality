import type { AppState, Screen } from '../../app/store';

export function tabsHtml(state: AppState): string {
  const spec = state.spec;
  const p = state.persistent;
  const unread = p.chroniclesOpened.filter((id) => !p.chroniclesRead.includes(id)).length;
  const tabs: { id: string; label: string; badge?: number }[] = [
    { id: 'map', label: '← Map' },
    { id: 'board', label: 'Evidence Board' },
    { id: 'codex', label: 'Codex' },
    { id: 'chronicles', label: 'Chronicles', badge: unread },
    { id: 'cards', label: 'Cards' },
  ];
  const statuses: Partial<Record<Screen, string>> = {
    board: `${p.mysterySolved.length} of ${spec.mystery.questions.length} solved · carries across every game`,
    codex: `${p.codexSeen.length} of ${spec.codex.length} terms seen`,
    chronicles: `${p.chroniclesOpened.length} of ${spec.chronicles.length} pages opened`,
    cards: `${p.cardsEarned.length} of ${spec.cards.length} collected`,
  };
  const rows = tabs
    .map(
      (tab) => `
      <button class="tab ${tab.id === state.screen ? 'tab-active' : ''}" data-action="nav" data-target="${tab.id}" data-testid="tab-${tab.id}">
        ${tab.label}
        ${tab.badge ? `<span class="tab-badge">${tab.badge}</span>` : ''}
      </button>`,
    )
    .join('');
  return `
    <nav class="tab-row">
      ${rows}
      <span class="tab-spacer"></span>
      <span class="tab-sealed">● Act II</span>
      <span class="tab-status" data-testid="tab-status">${statuses[state.screen as Screen] ?? ''}</span>
    </nav>`;
}
