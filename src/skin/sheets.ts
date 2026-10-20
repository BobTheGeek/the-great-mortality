import { fillClueText } from '../app/journal';
import { earnedCaption } from '../app/progress';
import type { AppState } from '../app/store';
import type { CodexEntry } from '../spec/types';
import { esc, renderCopy } from '../shell/dom';
import { calendarMonth, calendarYear, monthName, startYearFromSpec } from './calendar';
import { howtoSheetHtml } from './howto';
import { codexEntryHtml } from './screens/codex';

export function renderSheetHtml(state: AppState, codex: Map<string, CodexEntry>): string {
  const sheet = state.sheet;
  if (!sheet) return '';
  const spec = state.spec;
  const run = state.run;

  if (sheet.kind === 'howto') {
    return howtoSheetHtml(state);
  }

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
            sheet.ended ? 'On to the reckoning' : esc(view.nextLabel)
          }</button>
        </footer>
      </div>`;
  }

  if (sheet.kind === 'verdict' && run) {
    const question = spec.mystery.questions.find((q) => q.id === sheet.questionId);
    if (!question) return '';
    const verdict = sheet.verdict;
    const theory = question.theories.find((t) => t.id === sheet.theoryId);
    const verdictHead = `
        <p class="label verdict-kicker">Question ${question.numeral}</p>
        ${theory ? `<p class="verdict-theory">${esc(theory.text)}</p>` : ''}`;
    if (verdict.state === 'solved') {
      return `
        <div class="scrim" data-action="verdict-close"></div>
        <div class="sheet sheet-verdict" data-testid="sheet-verdict" role="dialog" aria-modal="true">
          ${verdictHead}
          <span class="stamp-wax"><span class="stamp-word">Solved</span><span class="stamp-numeral">${question.numeral}</span></span>
          <p class="verdict-summary">${renderCopy(verdict.summary ?? '', codex)}</p>
          <div class="sheet-actions sheet-actions-center">
            <button class="primary ink" data-action="verdict-pin" data-testid="verdict-pin">${esc(
              spec.mystery.verdicts.solved.button,
            )}</button>
          </div>
        </div>`;
    }
    if (verdict.state === 'notYet') {
      return `
        <div class="scrim" data-action="verdict-close"></div>
        <div class="sheet sheet-verdict" data-testid="sheet-verdict" role="dialog" aria-modal="true">
          ${verdictHead}
          <span class="stamp-ring stamp-notyet"><span>Not yet</span><span class="stamp-q">?</span></span>
          <p class="verdict-text verdict-quote">${esc(spec.mystery.verdicts.notYet.text)}</p>
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
        ${verdictHead}
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
              <span class="woodcut woodcut-art">
                <img class="woodcut-img" src="./cards/${card.id}.jpg" alt="" decoding="async" />
              </span>
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
      <div class="sheet sheet-small sheet-paused" data-testid="sheet-paused" role="dialog" aria-modal="true">
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
          <h3 class="section-label">This device</h3>
          <div class="settings-row">
            <button class="quiet" data-action="howto-open" data-testid="paused-howto">How to play</button>
            <button class="quiet danger-ghost" data-action="reset-progress" data-testid="reset-progress">Reset all progress</button>
          </div>
          <h3 class="section-label">Progress backup</h3>
          <p class="sheet-body small">A code that carries this ledger to another shelf, or back to this one if the browser forgets.</p>
          <div class="settings-row">
            <button class="quiet" data-action="copy-code" data-testid="copy-code">Copy progress code</button>
            <button class="quiet" data-action="restore-open" data-testid="restore-open">Restore from code</button>
          </div>
          ${state.codeText ? `<textarea class="code-field" data-testid="code-output" readonly rows="3">${esc(state.codeText)}</textarea>` : ''}
          ${
            state.restoreOpen
              ? `
          <textarea class="code-field" data-testid="code-input" rows="3" placeholder="Paste a progress code"></textarea>
          <div class="settings-row">
            <button class="quiet" data-action="restore-cancel">Never mind</button>
            <button class="primary" data-action="restore-code" data-testid="restore-code">Restore</button>
          </div>`
              : ''
          }
          ${state.codeStatus ? `<p class="code-status" data-testid="code-status">${esc(state.codeStatus)}</p>` : ''}
          <h3 class="section-label">Credits</h3>
          <p class="credits">Built for the classroom. History after Ole Benedictow and Boccaccio; the plague’s true answer came from Yersin and Simond, 1894. Card engravings from public-domain collections via Wikimedia Commons.</p>
          <div class="sheet-actions">
            <button class="primary" data-action="paused-close" data-testid="paused-close">Return to the ledger</button>
          </div>`
        }
      </div>`;
  }

  if (sheet.kind === 'dev') {
    const run = state.run;
    const towns = run
      ? spec.towns
          .map((t) => {
            const town = run.towns[t.id]!;
            return `<tr><td>${esc(t.name)}</td><td>${Math.round(town.S)}</td><td>${Math.round(
              town.I,
            )}</td><td>${Math.round(town.P)}</td><td>${Math.round(town.D)}</td><td>${Math.round(
              town.R,
            )}</td><td>${Math.round(town.ratS + town.ratI)}</td></tr>`;
          })
          .join('')
      : '';
    const harness = state.devHarness
      ? `
        <table class="dev-table" data-testid="dev-harness-table">
          <thead><tr><th>Strategy</th><th>Survives</th><th>Overthrown</th><th>Fontenera</th></tr></thead>
          <tbody>${state.devHarness
            .map(
              (row) =>
                `<tr><td>${esc(row.name)}</td><td>${Math.round(row.avg * 100)}%</td><td>${Math.round(
                  row.overthrown * 100,
                )}%</td><td>${Math.round(row.spared * 100)}%</td></tr>`,
            )
            .join('')}</tbody>
        </table>`
      : '';
    return `
      <div class="sheet sheet-dev" data-testid="sheet-dev" role="dialog" aria-modal="true">
        <header class="dev-head">
          <div>
            <p class="label">Dev · the steward’s compass</p>
            <h2>Dev mode</h2>
          </div>
          <button class="icon-btn" data-action="dev-close" data-testid="dev-close" aria-label="Close">✕</button>
        </header>
        <section class="dev-section">
          <span class="dev-label">Seed</span>
          <code data-testid="dev-seed-current">${run ? run.seed : '—'}</code>
          <input type="number" class="dev-input" data-testid="dev-seed-input" placeholder="new seed" inputmode="numeric" />
          <button class="quiet" data-action="dev-new-seed" data-testid="dev-new-seed">New game with this seed</button>
        </section>
        <section class="dev-section">
          <span class="dev-label">Month ${run ? run.month + 1 : '—'} of ${spec.sim.months}</span>
          <input type="number" class="dev-input" data-testid="dev-skip-input" placeholder="N" inputmode="numeric" />
          <button class="quiet" data-action="dev-skip" data-testid="dev-skip">Skip to month N</button>
          <button class="quiet" data-action="dev-end" data-testid="dev-end">Run to the end</button>
        </section>
        <section class="dev-section">
          <button class="quiet" data-action="dev-lens" data-testid="dev-lens">Open the Lens</button>
          <button class="quiet" data-action="dev-howto" data-testid="dev-howto">Show how-to</button>
          <button class="quiet" data-action="dev-unlock" data-testid="dev-unlock">Unlock all</button>
          <button class="quiet danger-ghost" data-action="dev-reset" data-testid="dev-reset">Reset all</button>
        </section>
        ${state.devNote ? `<p class="dev-note" data-testid="dev-note">${esc(state.devNote)}</p>` : ''}
        ${
          towns
            ? `
        <section class="dev-section dev-col">
          <span class="dev-label">Towns · S/I/P/D/R · rats</span>
          <table class="dev-table" data-testid="dev-towns">
            <thead><tr><th>Town</th><th>S</th><th>I</th><th>P</th><th>D</th><th>R</th><th>Rats</th></tr></thead>
            <tbody>${towns}</tbody>
          </table>
        </section>`
            : ''
        }
        <section class="dev-section dev-col">
          <span class="dev-label">Fire an event</span>
          <div class="dev-chips">${(spec.scriptedEvents ?? [])
            .map(
              (event) =>
                `<button class="quiet dev-chip" data-action="dev-fire-event" data-id="${event.id}" data-testid="dev-event-${event.id}">${esc(event.title)}</button>`,
            )
            .join('')}</div>
        </section>
        <section class="dev-section dev-col">
          <span class="dev-label">Pin a clue</span>
          <div class="dev-chips">${spec.mystery.clues
            .map(
              (clue) =>
                `<button class="quiet dev-chip" data-action="dev-pin-clue" data-id="${clue.id}" data-testid="dev-clue-${clue.id}">${esc(clue.title)}</button>`,
            )
            .join('')}</div>
        </section>
        <section class="dev-section dev-col">
          <span class="dev-label">Balance harness</span>
          <button class="quiet" data-action="dev-harness" data-testid="dev-harness">Run harness (120 seeds/strategy)</button>
          ${harness}
        </section>
      </div>`;
  }

  if (sheet.kind === 'event' && run) {
    const def = spec.scriptedEvents?.find((e) => e.id === sheet.eventId);
    if (!def) return '';
    const cal = calendarMonth(spec.sim.startCalendarMonth, run.month - 1);
    const year = calendarYear(spec.sim.startCalendarMonth, run.month - 1, startYearFromSpec(spec));
    const label = `${def.place.toUpperCase()} · ${monthName(cal).toUpperCase()} ${year}`;
    return `
      <div class="event-ground" data-testid="sheet-event">
        <div class="sheet sheet-event" role="dialog" aria-modal="true">
          <p class="label">${esc(label)}</p>
          <h2>${esc(def.title)}</h2>
          ${def.paragraphs.map((p) => `<p class="event-p">${renderCopy(p, codex)}</p>`).join('')}
          <p class="event-action">${renderCopy(def.stewardAction, codex)}</p>
          <div class="event-foot-row">
            <p class="event-footer">${renderCopy(def.footer, codex)}</p>
            <button class="primary ink" data-action="event-read" data-testid="event-read">${esc(def.button)}</button>
          </div>
        </div>
      </div>`;
  }

  if (sheet.kind === 'advisor' && run) {
    const advisor = spec.advisors.find((a) => a.id === sheet.advisorId);
    if (!advisor) return '';
    const line =
      state.advisorPeek && state.advisorPeek.advisorId === advisor.id ? state.advisorPeek.text : '';
    const first = line.slice(0, 1);
    const rest = line.slice(1);
    const offer = sheet.offer;
    const offerDecree = offer ? spec.decrees.find((d) => d.id === offer.decreeId) : undefined;
    const offerTown = offer?.townId ? spec.towns.find((t) => t.id === offer.townId) : undefined;
    const offerHtml = offer
      ? `
        <button class="advisor-offer" data-action="advisor-take" data-testid="advisor-take">
          <span class="advisor-offer-name">${
            offer.kind === 'lift'
              ? `Lift “${esc(offerDecree?.name ?? offer.decreeId)}”`
              : `${esc(offerDecree?.name ?? offer.decreeId)}${
                  offerTown ? ` at ${esc(offerTown.name)}` : ''
                }`
          }</span>
          ${offer.kind === 'decree' ? `<span class="advisor-offer-cost">${offer.cost} ƒ</span>` : ''}
        </button>`
      : '';
    const footnote = offer
      ? offer.kind === 'decree'
        ? 'He offers a decree. Taking it costs a decree slot, as any other would.'
        : 'He asks you to lift a decree. That costs nothing and uses no decree slot.'
      : '';
    return `
      <div class="advisor-ground" data-testid="sheet-advisor">
        <div class="sheet sheet-advisor" role="dialog" aria-modal="true">
          <div class="advisor-body">
            <div class="advisor-portrait">
              <span class="placeholder">illuminated portrait · ${esc(advisor.name)}</span>
              <span class="advisor-name-label">${esc(advisor.name.toUpperCase())}</span>
            </div>
            <div class="advisor-speech">
              <p class="advisor-line"><span class="dropcap">${esc(first)}</span>${renderCopy(rest, codex)}</p>
              ${footnote ? `<p class="advisor-footnote">${esc(footnote)}</p>` : ''}
              <div class="advisor-offer-row">
                ${offerHtml}
                <button class="quiet" data-action="advisor-thanks" data-testid="advisor-thanks">Thank him, and no</button>
              </div>
            </div>
          </div>
        </div>
        <p class="advisor-caption">Advisors speak sincerely. Whether they are right is for you to find out.</p>
      </div>`;
  }

  if (sheet.kind === 'lens-reveal') {
    const lens = spec.mystery.lensReveal;
    const first = lens.title.slice(0, 1);
    const rest = lens.title.slice(1);
    return `
      <div class="lens-ground" data-testid="sheet-lens-reveal">
        <div class="sheet sheet-lens" role="dialog" aria-modal="true">
          <p class="label">${esc(lens.kicker.toUpperCase())}</p>
          <span class="lens-glyph" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <circle cx="52" cy="52" r="42" fill="#f7ecd6" stroke="#b8902e" stroke-width="3"></circle>
              <circle cx="52" cy="52" r="30" fill="none" stroke="#2a1c10" stroke-width="2"></circle>
              <circle cx="52" cy="52" r="10" fill="#8b2e2e"></circle>
              <path d="M82 82 L108 108" stroke="#2a1c10" stroke-width="8" stroke-linecap="round"></path>
            </svg>
          </span>
          <h2><span class="dropcap">${esc(first)}</span>${esc(rest)}</h2>
          <p class="lens-body">${esc(lens.body)}</p>
          <div class="lens-chips">${lens.chips.map((chip) => `<span class="lens-chip">${esc(chip)}</span>`).join('')}</div>
          <button class="primary" data-action="lens-enter" data-testid="lens-enter">${esc(lens.button)}</button>
          <p class="lens-footnote">${esc(lens.footnote)}</p>
        </div>
      </div>`;
  }

  return '';
}
