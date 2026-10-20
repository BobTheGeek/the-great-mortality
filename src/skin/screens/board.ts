import { clueCountFor, isQuestionSolved } from '../../app/mystery';
import type { AppState } from '../../app/store';
import { fillPlaceholders } from '../../spec/markup';
import type { CodexEntry, QuestionDef, Spec } from '../../spec/types';
import { esc, renderCopy } from '../../shell/dom';
import type { RunJournal } from '../../shell/state';

function clueTown(journal: RunJournal, clueId: string): string | undefined {
  const entry = [...journal.entries].reverse().find((e) => e.kind === 'clue' && e.refId === clueId);
  return entry?.townId;
}

function fillClue(spec: Spec, journal: RunJournal, text: string, clueId: string): string {
  const townId = clueTown(journal, clueId);
  const town = townId ? (spec.towns.find((t) => t.id === townId)?.name ?? townId) : '';
  return fillPlaceholders(text, { town });
}

function theoryLabel(theoryId: string): string {
  return theoryId.split('-').slice(1).join(' ').toUpperCase();
}

function questionRow(state: AppState, q: QuestionDef, codex: Map<string, CodexEntry>): string {
  const p = state.persistent;
  const solved = isQuestionSolved(p, q.id);
  const selected = state.boardQuestion === q.id;
  const count = clueCountFor(state.spec, p, q.id);
  const label = solved
    ? `Question ${q.numeral} · Solved`
    : `Question ${q.numeral} · Open · ${
        count === 0 ? 'no clues yet' : `${count} ${count === 1 ? 'clue' : 'clues'}`
      }`;
  const disc = solved
    ? `<span class="q-seal">${q.numeral}</span>`
    : `<span class="q-disc ${selected ? 'q-disc-selected' : ''}">${q.numeral}</span>`;
  const answer = solved
    ? `<span class="q-answer">${renderCopy(q.solvedSummary, codex)}</span>`
    : selected
      ? '<span class="q-answer q-answer-hint">Tap a theory on the right.</span>'
      : '';
  return `
    <button class="q-row ${solved ? 'q-solved' : ''} ${selected ? 'q-selected' : ''}" data-action="board-question" data-id="${q.id}" data-testid="board-q-${q.id}">
      ${disc}
      <span class="q-body">
        <span class="q-label">${label}</span>
        <span class="q-text">${esc(q.text)}</span>
        ${answer}
      </span>
    </button>`;
}

function rightPane(state: AppState, q: QuestionDef, codex: Map<string, CodexEntry>): string {
  if (isQuestionSolved(state.persistent, q.id)) {
    return `<div class="board-solved-pane"><p class="label">Solved</p><p class="solved-summary">${renderCopy(
      q.solvedSummary,
      codex,
    )}</p></div>`;
  }
  const theories = q.theories
    .map(
      (theory) => `
      <button class="theory" data-action="verdict-argue" data-question="${q.id}" data-id="${theory.id}" data-testid="theory-${theory.id}">${esc(theory.text)}</button>`,
    )
    .join('');
  return `<div class="theory-grid">${theories}</div>`;
}

function scrapsHtml(state: AppState, q: QuestionDef, codex: Map<string, CodexEntry>): string {
  const p = state.persistent;
  const clues = state.spec.mystery.clues.filter(
    (clue) => clue.questions.includes(q.id) && p.cluesFound.includes(clue.id),
  );
  const rotations = [-1.6, 1.2, -0.8, 1.5, -1.1, 0.9];
  const scraps = clues
    .map((clue, index) => {
      const text = fillClue(state.spec, state.journal, clue.text, clue.id);
      const chips = [
        ...clue.for.map((t) => `<span class="marker marker-for">For · ${theoryLabel(t)}</span>`),
        ...clue.against.map(
          (t) => `<span class="marker marker-against">Against · ${theoryLabel(t)}</span>`,
        ),
      ].join('');
      return `
        <article class="scrap" data-for="${clue.for.join(' ')}" data-testid="scrap-${clue.id}" style="--rot:${rotations[index % rotations.length]}deg">
          <span class="scrap-pin"></span>
          <h4>${esc(clue.title)}</h4>
          <p>${renderCopy(text, codex)}</p>
          <div class="markers">${chips}</div>
        </article>`;
    })
    .join('');
  const remaining = state.spec.mystery.clues.length - p.cluesFound.length;
  const placeholder =
    remaining > 0
      ? `<div class="scrap-placeholder">${remaining} more scrap${remaining === 1 ? '' : 's'} yet to find</div>`
      : '';
  return `<div class="scrap-field" data-testid="scrap-field"><svg class="thread-layer"></svg>${scraps}${placeholder}</div>`;
}

export function boardHtml(state: AppState, codex: Map<string, CodexEntry>): string {
  const spec = state.spec;
  const selectedId = state.boardQuestion ?? spec.mystery.questions[0]!.id;
  const q = spec.mystery.questions.find((x) => x.id === selectedId) ?? spec.mystery.questions[0]!;
  const found = state.persistent.cluesFound.length;
  const right =
    found === 0
      ? `
        <div class="board-empty" data-testid="board-empty">
          <div class="board-empty-frame"><span class="scrap-pin"></span></div>
          <h2 class="board-empty-title">The board is bare.</h2>
          <p class="board-empty-note">Clues are pinned here as the months pass. The four questions are already waiting on the left.</p>
        </div>`
      : `
        <div class="board-head">
          <h2>Theories for Question ${q.numeral}</h2>
          <span class="board-found">clues below · ${found} of ${spec.mystery.clues.length} found</span>
        </div>
        ${rightPane(state, q, codex)}
        ${scrapsHtml(state, q, codex)}`;
  return `
    <div class="spread board-spread">
      <section class="leaf leaf-left board-left">
        <h1 class="screen-heading">What is killing them?</h1>
        <p class="screen-hint">Four questions. Argue a theory when you think the clues support it.</p>
        <div class="q-list">${spec.mystery.questions
          .map((question) => questionRow(state, question, codex))
          .join('')}</div>
        <p class="board-foot">Solve all four to unseal the Physician's Lens.</p>
      </section>
      <div class="spine"></div>
      <section class="leaf leaf-right board-right">${right}</section>
    </div>`;
}

export function mountBoardThreads(root: HTMLElement): void {
  const field = root.querySelector<HTMLElement>('.scrap-field');
  const svg = field?.querySelector<SVGSVGElement>('.thread-layer');
  if (!field || !svg) return;
  const fieldRect = field.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${fieldRect.width} ${fieldRect.height}`);
  svg.setAttribute('width', String(fieldRect.width));
  svg.setAttribute('height', String(fieldRect.height));
  const scraps = [...field.querySelectorAll<HTMLElement>('.scrap')].map((el) => ({
    rect: el.getBoundingClientRect(),
    forIds: new Set((el.dataset.for ?? '').split(' ').filter(Boolean)),
  }));
  let markup = '';
  for (let i = 0; i < scraps.length; i++) {
    for (let j = i + 1; j < scraps.length; j++) {
      const a = scraps[i]!;
      const b = scraps[j]!;
      if (![...a.forIds].some((id) => b.forIds.has(id))) continue;
      const above = a.rect.top <= b.rect.top ? a : b;
      const below = above === a ? b : a;
      const x1 = above.rect.left - fieldRect.left + above.rect.width / 2;
      const y1 = above.rect.bottom - fieldRect.top;
      const x2 = below.rect.left - fieldRect.left + below.rect.width / 2;
      const y2 = below.rect.top - fieldRect.top;
      markup += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${(y1 + 40).toFixed(
        1,
      )}, ${x2.toFixed(1)} ${(y2 - 40).toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}" />`;
    }
  }
  svg.innerHTML = markup;
}
