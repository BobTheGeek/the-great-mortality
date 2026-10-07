import './styles/tokens.css';
import './styles/shell.css';
import './styles/mortality.css';
import { createFlow } from './app/flow';
import { createStore } from './app/store';
import { hydrateRun } from './engine/serialize';
import { loadSpec } from './spec/load';
import { validateSpec } from './spec/validate';
import { createDefaultStore } from './shell/persistence';
import { SaveStore } from './shell/save';
import { createJournal, createPersistentState } from './shell/state';
import { createApp } from './skin/app';

async function boot(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  const spec = loadSpec();
  const validation = validateSpec(spec);
  if (!validation.ok) {
    root.innerHTML = `
      <div class="app app-start">
        <main class="start-card">
          <p class="kicker">The ledger will not open</p>
          <h1>The content spec is invalid</h1>
          <ul class="errors">${validation.errors.map((error) => `<li>${error}</li>`).join('')}</ul>
        </main>
      </div>`;
    if (import.meta.env.DEV) {
      throw new Error(`Spec validation failed:\n${validation.errors.join('\n')}`);
    }
    return;
  }

  const kv = await createDefaultStore();
  const saves = new SaveStore(kv, spec.meta.version);
  const doc = await saves.load();
  const persistent = doc?.persistent ?? createPersistentState();
  const journal = doc?.journal ?? createJournal();
  let run = null;
  if (doc?.run) {
    try {
      run = hydrateRun(spec, doc.run);
    } catch {
      run = null;
    }
  }

  const store = createStore({
    spec,
    persistent,
    run,
    journal,
    screen: run ? 'map' : 'start',
    ledger: 'ledger',
    selectedTown: null,
    selectedDecree: null,
    sheet: null,
  });
  const flow = createFlow({ store, saves });
  const codex = new Map(spec.codex.map((entry) => [entry.id, entry]));
  const app = createApp({ store, flow, codex });
  store.subscribe(() => app.render());
  app.render();
}

void boot();
