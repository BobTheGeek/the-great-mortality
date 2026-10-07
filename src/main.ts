import './styles/tokens.css';
import './styles/foundation.css';
import { createRun, endMonth, issueDecree, survival } from './engine/engine';
import { loadSpec } from './spec/load';
import { validateSpec } from './spec/validate';
import { createDefaultStore } from './shell/persistence';
import { SaveStore } from './shell/save';
import type { Spec } from './spec/types';

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function smokeSurvival(spec: Spec, seed: number, withHoldShips: boolean): number {
  const run = createRun(spec, { seed });
  if (withHoldShips) issueDecree(run, 'hold-ships');
  while (!run.ended) endMonth(run);
  return survival(run);
}

async function storageStatus(specVersion: string): Promise<string> {
  const store = await createDefaultStore();
  const probeKey = 'tgm.foundation.probe';
  const stamp = new Date().toISOString();
  await store.set(probeKey, stamp);
  const readBack = await store.get(probeKey);
  const roundTrip = readBack === stamp ? 'round-trip OK' : 'round-trip FAILED';
  const saves = new SaveStore(store, specVersion);
  const existing = await saves.load();
  return `backend: ${store.kind} · ${roundTrip} · existing save: ${existing ? 'yes' : 'no'}`;
}

async function boot(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const spec = loadSpec();
  const validation = validateSpec(spec);
  const storage = await storageStatus(spec.meta.version);

  const counts = [
    `${spec.towns.length} towns`,
    `${spec.decrees.length} decrees`,
    `${spec.mystery.clues.length} clues`,
    `${spec.mystery.questions.length} questions`,
    `${spec.codex.length} codex terms`,
    `${spec.chronicles.length} chronicles`,
    `${spec.cards.length} cards`,
  ].join(' · ');

  const specLine = validation.ok
    ? 'Spec validation: OK'
    : `Spec validation: FAILED (${validation.errors.length} errors)`;

  app.innerHTML = `
    <main class="foundation" data-testid="foundation-status">
      <header>
        <p class="kicker">The Great Mortality · Foundation</p>
        <h1>Milestone 1 status</h1>
        <p class="sub">No game UI yet. This page proves the core layers running in a real browser.</p>
      </header>
      <section>
        <h2>Content spec</h2>
        <p data-testid="spec-status" class="status ${validation.ok ? 'ok' : 'bad'}">${specLine}</p>
        <p class="detail">${spec.meta.id} · v${spec.meta.version} · ${counts}</p>
        ${
          validation.ok
            ? ''
            : `<ul class="errors">${validation.errors.map((error) => `<li>${error}</li>`).join('')}</ul>`
        }
      </section>
      <section>
        <h2>Engine (seed 1000)</h2>
        <p data-testid="engine-status" class="detail">do nothing: ${percent(
          smokeSurvival(spec, 1000, false),
        )} survival · hold ships: ${percent(smokeSurvival(spec, 1000, true))} survival</p>
      </section>
      <section>
        <h2>Persistence</h2>
        <p data-testid="storage-status" class="detail">${storage}</p>
      </section>
      <section>
        <h2>Viewport</h2>
        <p data-testid="viewport" class="detail"></p>
      </section>
      <footer>
        <p class="sub">Next: Milestone 2 — the shell and the map.</p>
      </footer>
    </main>
  `;

  const viewport = document.querySelector('[data-testid="viewport"]');
  const paint = () => {
    if (viewport) viewport.textContent = `${window.innerWidth} × ${window.innerHeight}`;
  };
  paint();
  window.addEventListener('resize', paint);
}

void boot();
