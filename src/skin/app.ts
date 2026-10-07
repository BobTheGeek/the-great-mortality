import type { CodexEntry } from '../spec/types';
import { applyTheme, darknessT, themeFor } from '../skin/theme';
import { createMapController, type MapController } from '../skin/map';
import { mountMapShell, renderHeading, renderLedger } from '../skin/screens/map';
import { renderStart } from '../skin/screens/start';
import { renderSheetHtml } from '../skin/sheets';
import { latestForTown } from '../app/journal';
import type { Flow } from '../app/flow';
import type { Store } from '../app/store';

export interface AppDeps {
  store: Store;
  flow: Flow;
  codex: Map<string, CodexEntry>;
}

export function createApp(deps: AppDeps): { render(): void } {
  const root = document.getElementById('app');
  if (!root) throw new Error('missing #app');
  let mapController: MapController | null = null;

  root.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (!target) return;
    const state = deps.store.get();
    if (state.screen === 'map') {
      const townEl = target.closest('g[id^="town-"]');
      if (townEl) {
        deps.flow.townClick(townEl.id.slice('town-'.length));
        return;
      }
    }
    const actionEl = target.closest('[data-action]') as HTMLElement | null;
    if (!actionEl) return;
    const action = actionEl.dataset.action ?? '';
    deps.flow.actions[action]?.(actionEl);
  });

  function render(): void {
    const state = deps.store.get();
    if (state.screen === 'start' || !state.run) {
      mapController = null;
      renderStart(root!, state, deps.codex);
      return;
    }

    mountMapShell(root!);
    if (!mapController) {
      mapController = createMapController(root!.querySelector('[data-testid="map-host"]')!);
    }

    let dead = 0;
    let pop = 0;
    Object.values(state.run.towns).forEach((t) => {
      dead += t.D;
      pop += t.pop;
    });
    applyTheme(root!, themeFor(darknessT(dead, pop)));

    renderHeading(root!, state);
    renderLedger(root!, state, deps.codex);

    const sheetHost = root!.querySelector('[data-testid="sheet-host"]');
    if (sheetHost) sheetHost.innerHTML = renderSheetHtml(state, deps.codex);

    mapController.update({
      spec: state.spec,
      run: state.run,
      selectedDecree: state.selectedDecree,
      focusTown: state.ledger === 'town' ? state.selectedTown : null,
    });

    const texts: string[] = [];
    if (state.sheet?.kind === 'report') {
      texts.push(
        ...state.sheet.view.written,
        state.sheet.view.footer,
        ...state.sheet.view.newClues.map((clue) => clue.text),
      );
    }
    if (state.ledger === 'town' && state.selectedTown) {
      texts.push(...latestForTown(state.spec, state.journal, state.selectedTown).map((line) => line.text));
    }
    if (texts.length) deps.flow.markSeen(texts);
  }

  return { render };
}
