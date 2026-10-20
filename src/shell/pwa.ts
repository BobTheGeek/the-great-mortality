/** Small helpers for the installed-app experience. */

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
}

export function shouldShowA2hs(
  standalone: boolean,
  persistent: { a2hsDismissed: boolean },
): boolean {
  return !standalone && !persistent.a2hsDismissed;
}

export function requestStoragePersist(): void {
  const storage = navigator.storage as StorageManager | undefined;
  if (storage && typeof storage.persist === 'function') {
    void storage.persist().catch(() => undefined);
  }
}

/**
 * Registers the service worker and, when a new edition is waiting, offers a
 * Reload. The page is never reloaded without the player tapping the button.
 */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then((registration) => {
      const announce = (worker: ServiceWorker): void => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(worker);
          }
        });
      };
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(registration.waiting);
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (worker) announce(worker);
      });
    })
    .catch(() => undefined);
}

function showUpdateToast(worker: ServiceWorker): void {
  if (document.getElementById('edition-toast')) return;
  const toast = document.createElement('div');
  toast.id = 'edition-toast';
  toast.className = 'edition-toast';
  toast.setAttribute('data-testid', 'edition-toast');
  toast.innerHTML = `
    <span class="edition-text">A new edition of the ledger is ready.</span>
    <button class="edition-reload" data-testid="edition-reload">Reload</button>`;
  toast.querySelector('button')?.addEventListener('click', () => {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
    worker.postMessage({ type: 'skip-waiting' });
  });
  document.body.appendChild(toast);
}
