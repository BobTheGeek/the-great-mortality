import type { AppState } from '../app/store';
import { fillPlaceholders } from '../spec/markup';
import type { CodexEntry } from '../spec/types';
import { esc, renderCopy } from '../shell/dom';

export function renderSheetHtml(state: AppState, codex: Map<string, CodexEntry>): string {
  const sheet = state.sheet;
  if (!sheet) return '';
  const spec = state.spec;
  const run = state.run;

  if (sheet.kind === 'confirm-issue' && run) {
    const decree = spec.decrees.find((d) => d.id === sheet.decreeId);
    const town = spec.towns.find((t) => t.id === sheet.townId);
    if (!decree || !town) return '';
    return `
      <div class="scrim" data-action="confirm-cancel"></div>
      <div class="sheet sheet-small" data-testid="sheet-confirm" role="dialog" aria-modal="true">
        <h2>Issue “${esc(decree.name)}”?</h2>
        <p class="sheet-body">${esc(decree.description)}</p>
        <p class="sheet-meta">In ${esc(town.name)} · costs ${decree.cost} ƒ</p>
        <div class="sheet-actions">
          <button class="quiet" data-action="confirm-cancel">Cancel</button>
          <button class="primary" data-action="confirm-issue" data-testid="confirm-issue">Issue</button>
        </div>
      </div>`;
  }

  if (sheet.kind === 'confirm-flee') {
    const flee = spec.decrees.find((d) => d.id === 'flee');
    return `
      <div class="scrim" data-action="confirm-cancel"></div>
      <div class="sheet sheet-small" data-testid="sheet-confirm" role="dialog" aria-modal="true">
        <h2>Leave the towns to their fate?</h2>
        <p class="sheet-body">${esc(flee?.description ?? '')}</p>
        <div class="sheet-actions">
          <button class="quiet" data-action="confirm-cancel">Stay</button>
          ${
            sheet.armed
              ? '<button class="primary" data-action="flee-confirm" data-testid="confirm-issue">Tap again to leave</button>'
              : '<button class="primary" data-action="flee-arm" data-testid="confirm-issue">Leave the towns to their fate.</button>'
          }
        </div>
      </div>`;
  }

  if (sheet.kind === 'report' && run) {
    const view = sheet.view;
    const burials = view.burials
      .map(
        (b) => `
        <li class="burial-row">
          <span class="burial-name">${esc(b.name)}</span>
          <span class="burial-track"><span class="burial-fill ${b.deaths >= 100 ? 'hatched' : 'solid'}" style="width:${(
            b.barPct * 100
          ).toFixed(1)}%"></span></span>
          <span class="burial-value">${b.valueLabel}</span>
        </li>`,
      )
      .join('');
    const written = view.written.map((line) => `<p>${renderCopy(line, codex)}</p>`).join('');
    const pinned = view.newClues.length
      ? `
        <div class="pinned">
          <span class="pinned-tag">Pinned to the Evidence Board</span>
          ${view.newClues
            .map(
              (clue) =>
                `<div class="pinned-row"><strong>${esc(clue.title)}</strong><p>${renderCopy(
                  clue.text,
                  codex,
                )}</p></div>`,
            )
            .join('')}
        </div>`
      : '';
    return `
      <div class="scrim"></div>
      <div class="sheet sheet-report" data-testid="sheet-report" role="dialog" aria-modal="true">
        <header class="report-head">
          <div>
            <p class="label">The chronicle of the region · ${esc(view.monthLabel)}</p>
            <h2 class="report-heading">${esc(view.heading)}</h2>
          </div>
          <div class="report-buried">
            <span class="label">Buried this month</span>
            <span class="report-number">${view.buriedThisMonth.toLocaleString('en-US')}</span>
          </div>
        </header>
        <div class="report-cols">
          <div class="report-left">
            <h3 class="section-label">Burials by town</h3>
            <ul class="burials">${burials}</ul>
            <h3 class="section-label">It is written that</h3>
            <div class="written">${written}</div>
          </div>
          <div class="report-right">${pinned}</div>
        </div>
        <footer class="report-foot">
          <p class="report-footer">${renderCopy(view.footer, codex)}</p>
          <button class="primary report-next" data-action="report-next" data-testid="report-next">${
            sheet.ended ? 'Begin again' : esc(view.nextLabel)
          }</button>
        </footer>
      </div>`;
  }

  if (sheet.kind === 'paused') {
    return `
      <div class="scrim" data-action="paused-close"></div>
      <div class="sheet sheet-small" data-testid="sheet-paused" role="dialog" aria-modal="true">
        <h2>Paused</h2>
        ${
          sheet.resetArmed
            ? `
          <p class="sheet-body">Are you certain? Every solved question, every earned card, every opened chronicle.</p>
          <div class="sheet-actions">
            <button class="quiet" data-action="reset-cancel">No, keep it</button>
            <button class="primary" data-action="reset-confirm" data-testid="reset-confirm">Yes, reset everything</button>
          </div>`
            : `
          <div class="sheet-actions">
            <button class="quiet danger-ghost" data-action="reset-progress" data-testid="reset-progress">Reset all progress</button>
            <button class="primary" data-action="paused-close" data-testid="paused-close">Return to the ledger</button>
          </div>`
        }
      </div>`;
  }

  if (sheet.kind === 'end-stub' && run) {
    const ending = sheet.ended === 'fled' ? spec.endings.fled : spec.endings.overthrown;
    const title = fillPlaceholders(ending.title, { steward: run.steward });
    return `
      <div class="scrim"></div>
      <div class="sheet sheet-small" data-testid="sheet-end" role="dialog" aria-modal="true">
        <h2>${esc(title)}</h2>
        <p class="sheet-body">${esc(ending.body)}</p>
        <p class="sheet-meta">${esc(ending.footnote)}</p>
        <p class="sheet-meta">The full reckoning screen arrives with Milestone 4.</p>
        <div class="sheet-actions">
          <button class="primary" data-action="end-begin-again">Begin again</button>
        </div>
      </div>`;
  }

  return '';
}
