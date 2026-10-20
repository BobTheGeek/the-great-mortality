import { fillClueText } from '../app/journal';
import { earnedCaption } from '../app/progress';
import type { AppState } from '../app/store';
import { fillPlaceholders } from '../spec/markup';
import type { CodexEntry } from '../spec/types';
import { esc, renderCopy } from '../shell/dom';
import { codexEntryHtml } from './screens/codex';

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
    const unlocks = sheet.unlocks
      .map((event) => {
        const codexTerm = spec.codex.find((c) => c.id === event.id);
        const chronicle = spec.chronicles.find((c) => c.id === event.id);
        const card = spec.cards.find((c) => c.id === event.id);
        const title =
          event.kind === 'codex' ? codexTerm?.term : event.kind === 'chronicle' ? chronicle?.title : card?.myth;
        const kindLabel =
          event.kind === 'codex'
            ? 'Codex'
            : event.kind === 'chronicle'
              ? 'Chronicle'
              : 'Myth-Buster Card';
        return `
          <li class="unlock-row" data-testid="unlock-${event.kind}-${event.id}">
            <span class="unlock-glyph glyph-${event.kind}"></span>
            <span class="unlock-body"><span class="unlock-kind">${kindLabel}</span><span class="unlock-title">${esc(
              title ?? event.id,
            )}</span></span>
          </li>`;
      })
      .join('');
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
          <div class="report-right">
            ${pinned}
            ${unlocks ? `<h3 class="section-label">Newly unlocked</h3><ul class="unlocks">${unlocks}</ul>` : ''}
          </div>
        </div>
        <footer class="report-foot">
          <p class="report-footer">${renderCopy(view.footer, codex)}</p>
          <button class="primary report-next" data-action="report-next" data-testid="report-next">${
            sheet.ended ? 'Begin again' : esc(view.nextLabel)
          }</button>
        </footer>
      </div>`;
  }

  if (sheet.kind === 'verdict' && run) {
    const question = spec.mystery.questions.find((q) => q.id === sheet.questionId);
    if (!question) return '';
    const verdict = sheet.verdict;
    if (verdict.state === 'solved') {
      return `
        <div class="scrim" data-action="verdict-close"></div>
        <div class="sheet sheet-verdict" data-testid="sheet-verdict" role="dialog" aria-modal="true">
          <span class="stamp-wax"><span class="stamp-word">Solved</span><span class="stamp-numeral">${question.numeral}</span></span>
          <p class="verdict-summary">${renderCopy(verdict.summary ?? '', codex)}</p>
          <div class="sheet-actions sheet-actions-center">
            <button class="primary" data-action="verdict-pin" data-testid="verdict-pin">${esc(
              spec.mystery.verdicts.solved.button,
            )}</button>
          </div>
        </div>`;
    }
    if (verdict.state === 'notYet') {
      return `
        <div class="scrim" data-action="verdict-close"></div>
        <div class="sheet sheet-verdict" data-testid="sheet-verdict" role="dialog" aria-modal="true">
          <span class="stamp-ring stamp-notyet"><span>Not yet</span><span class="stamp-q">?</span></span>
          <p class="verdict-text">${esc(spec.mystery.verdicts.notYet.text)}</p>
          <p class="verdict-hint">${esc(verdict.hint ?? '')}</p>
          <div class="sheet-actions sheet-actions-center">
            <button class="quiet" data-action="verdict-close" data-testid="verdict-close">${esc(
              spec.mystery.verdicts.notYet.button,
            )}</button>
          </div>
        </div>`;
    }
    const lead = verdict.religious
      ? spec.mystery.verdicts.wrong.religiousText
      : spec.mystery.verdicts.wrong.text;
    const clueBlock = verdict.clue
      ? `
        <article class="scrap scrap-inline" data-testid="verdict-clue">
          <h4>${esc(verdict.clue.title)}</h4>
          <p>${renderCopy(fillClueText(spec, state.journal, verdict.clue.id, verdict.clue.text), codex)}</p>
        </article>`
      : '';
    return `
      <div class="scrim" data-action="verdict-close"></div>
      <div class="sheet sheet-verdict" data-testid="sheet-verdict" role="dialog" aria-modal="true">
        <span class="stamp-ring stamp-hardno"><span>The clues</span><span>say no</span></span>
        <p class="verdict-text">${esc(lead ?? '')}</p>
        ${clueBlock}
        ${
          verdict.clue
            ? ''
            : `<p class="verdict-hint" data-testid="verdict-noclue">${esc(verdict.text ?? '')}</p>`
        }
        <div class="sheet-actions sheet-actions-center">
          <button class="quiet" data-action="verdict-close" data-testid="verdict-close">${esc(
            spec.mystery.verdicts.wrong.button,
          )}</button>
        </div>
      </div>`;
  }

  if (sheet.kind === 'earned' && run) {
    const card = spec.cards.find((c) => c.id === sheet.cardId);
    if (!card) return '';
    const caption = earnedCaption(spec, state.persistent, card.id);
    const stampCls = card.verdict === 'partly-true' ? 'stamp-partly' : 'stamp-busted';
    const stampText = card.verdict === 'partly-true' ? 'Partly true' : 'Busted';
    return `
      <div class="earned-ground" data-testid="earned-moment">
        <p class="label earned-label">Earned · tap the card</p>
        <div class="earned-card" data-id="${card.id}">
          <div class="earned-inner">
            <button class="earned-face earned-front" data-action="earned-flip">
              <span class="card-label">Myth · ${card.numeral} · Front</span>
              <span class="woodcut">woodcut · ${esc(card.numeral)}</span>
              <span class="card-myth">${esc(card.myth)}</span>
            </button>
            <button class="earned-face earned-back" data-action="earned-flip">
              <span class="card-label">Myth · ${card.numeral} · Verdict</span>
              <span class="stamp stamp-big ${stampCls}">${stampText}</span>
              <span class="card-story">${esc(card.story)}</span>
              <span class="card-how"><span class="label">How do we know?</span>${esc(card.howWeKnow)}</span>
            </button>
          </div>
        </div>
        ${caption ? `<p class="earned-caption">${esc(caption)}</p>` : ''}
        <button class="primary" data-action="earned-keep" data-testid="earned-keep">Keep it</button>
      </div>`;
  }

  if (sheet.kind === 'codex-term') {
    const term = spec.codex.find((c) => c.id === sheet.termId);
    if (!term) return '';
    const x = Math.min(Math.max(sheet.x, 60), Math.max(60, window.innerWidth - 60));
    const y = Math.min(sheet.y + 14, Math.max(80, window.innerHeight - 80));
    return `
      <div class="scrim popover-scrim" data-action="popover-close"></div>
      <div class="popover" data-testid="popover" style="left:${x.toFixed(0)}px; top:${y.toFixed(0)}px">
        <span class="popover-arrow"></span>
        <header class="popover-head">
          <div>
            <p class="label">Codex · ${esc(term.pos.toUpperCase())}</p>
            <h3>${esc(term.term)}</h3>
          </div>
          <button class="icon-btn" data-action="popover-close" data-testid="popover-close" aria-label="Close">✕</button>
        </header>
        ${codexEntryHtml(
          term,
          `<footer class="popover-foot">
            <span class="popover-seen">Added to your Codex · ${state.persistent.codexSeen.length} of ${
              spec.codex.length
            } terms seen</span>
            <button class="quiet" data-action="open-codex" data-testid="open-codex">Open the Codex →</button>
          </footer>`,
        )}
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
