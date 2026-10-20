import { latestForTown } from '../app/journal';
import type { Flow } from '../app/flow';
import type { AppState, Store } from '../app/store';
import type { CodexEntry } from '../spec/types';
import { createMapController, type MapController } from '../skin/map';
import { boardHtml, mountBoardThreads } from '../skin/screens/board';
import { cardsHtml } from '../skin/screens/cards';
import { chroniclesHtml } from '../skin/screens/chronicles';
import { codexHtml } from '../skin/screens/codex';
import { renderEnding, renderReckoning } from '../skin/screens/end';
import { mountMapShell, renderHeading, renderLedger, renderPeek } from '../skin/screens/map';
import { renderStart } from '../skin/screens/start';
import { tabsHtml } from '../skin/screens/tabs';
import { renderSheetHtml } from '../skin/sheets';
import { applyTheme, darknessT, themeFor } from '../skin/theme';

export interface AppDeps {
  store: Store;
  flow: Flow;
  codex: Map<string, CodexEntry>;
}

export function createApp(deps: AppDeps): { render(): void } {
  const root = document.getElementById('app');
  if (!root) throw new Error('missing #app');
  let mapController: MapController | null = null;
  let mapHost: HTMLElement | null = null;

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

  function renderSheetHost(state: AppState): void {
    const sheetHost = root!.querySelector('[data-testid="sheet-host"]');
    if (sheetHost) sheetHost.innerHTML = renderSheetHtml(state, deps.codex);
  }

  function renderReference(state: AppState): void {
    mapController = null;
    mapHost = null;
    const content =
      state.screen === 'board'
        ? boardHtml(state, deps.codex)
        : state.screen === 'codex'
          ? codexHtml(state)
          : state.screen === 'chronicles'
            ? chroniclesHtml(state, deps.codex)
            : cardsHtml(state, deps.codex);
    root!.innerHTML = `
      <div class="app">
        <div class="screen">
          ${tabsHtml(state)}
          ${content}
        </div>
      </div>
      <div class="sheet-host" data-testid="sheet-host"></div>`;
    if (state.screen === 'board') mountBoardThreads(root!);
    renderSheetHost(state);
  }

  function renderMap(state: AppState): void {
    mountMapShell(root!);
    const host = root!.querySelector('[data-testid="map-host"]') as HTMLElement | null;
    if (host && (mapController === null || mapHost !== host)) {
      mapController = createMapController(host);
      mapHost = host;
    }
    let dead = 0;
    let pop = 0;
    Object.values(state.run!.towns).forEach((t) => {
      dead += t.D;
      pop += t.pop;
    });
    applyTheme(root!, themeFor(darknessT(dead, pop)));
    renderHeading(root!, state);
    renderLedger(root!, state, deps.codex);
    renderSheetHost(state);
    mapController?.update({
      spec: state.spec,
      run: state.run!,
      selectedDecree: state.selectedDecree,
      focusTown: state.ledger === 'town' ? state.selectedTown : null,
      lens: { open: state.lensOpen, layers: state.lensLayers },
    });
    renderPeek(root!, state, deps.codex);
    const texts: string[] = [];
    if (state.ledger === 'town' && state.selectedTown) {
      texts.push(
        ...latestForTown(state.spec, state.journal, state.selectedTown).map((line) => line.text),
      );
    }
    if (state.advisorPeek) texts.push(state.advisorPeek.text);
    if (texts.length) deps.flow.markSeen(texts);
  }

  function render(): void {
    const state = deps.store.get();
    if (state.screen === 'start' || !state.run) {
      mapController = null;
      mapHost = null;
      renderStart(root!, state, deps.codex);
      renderSheetHost(state);
      if (state.screen === 'start' && state.openingTitle) {
        deps.flow.markSeen([state.spec.opening.titleCard.body]);
      }
      return;
    }
    if (state.screen === 'map') {
      renderMap(state);
      return;
    }
    if (state.screen === 'ending') {
      mapController = null;
      mapHost = null;
      renderEnding(root!, state);
      renderSheetHost(state);
      return;
    }
    if (state.screen === 'reckoning') {
      mapController = null;
      mapHost = null;
      renderReckoning(root!, state);
      renderSheetHost(state);
      return;
    }
    renderReference(state);
  }

  return { render };
}
