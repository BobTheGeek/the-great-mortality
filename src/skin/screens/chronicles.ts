import { createQuizRecord, needsReviewDot, quizComplete } from '../../app/quiz';
import type { AppState } from '../../app/store';
import type { ChronicleDef, CodexEntry } from '../../spec/types';
import { esc, renderCopy } from '../../shell/dom';

function pinPositions(state: AppState): Map<string, number> {
  const spec = state.spec;
  const pins = spec.timeline.pins
    .map((id) => spec.chronicles.find((c) => c.id === id))
    .filter((c): c is ChronicleDef => Boolean(c));
  const span = spec.timeline.end - spec.timeline.start;
  const positions = new Map<string, number>();
  let previous = -Infinity;
  pins.forEach((chronicle, index) => {
    const raw = ((chronicle.pinYear - spec.timeline.start) / span) * 94 + 3;
    const x = index === 0 ? Math.max(raw, 3) : Math.max(raw, previous + 8);
    positions.set(chronicle.id, Math.min(x, 94));
    previous = x;
  });
  return positions;
}

function timelineHtml(state: AppState): string {
  const spec = state.spec;
  const p = state.persistent;
  const positions = pinPositions(state);
  const pins = spec.timeline.pins
    .map((id) => spec.chronicles.find((c) => c.id === id))
    .filter((c): c is ChronicleDef => Boolean(c))
    .map((chronicle) => {
      const opened = p.chroniclesOpened.includes(chronicle.id);
      const current = state.chronicleId === chronicle.id;
      const yearLabel = chronicle.pinYear === 1894 ? '1894–98' : String(chronicle.pinYear);
      const dot = opened
        ? `<button class="pin pin-open" data-action="chronicle-select" data-id="${chronicle.id}" aria-label="${esc(chronicle.title)}"></button>`
        : '<span class="pin pin-sealed"></span>';
      return `
        <div class="pin-wrap ${current ? 'pin-current' : ''}" style="left:${positions.get(chronicle.id) ?? 50}%">
          <span class="pin-title ${current ? 'pin-title-current' : ''}">${esc(chronicle.title)}</span>
          ${dot}
          <span class="pin-year">${yearLabel}</span>
        </div>`;
    })
    .join('');
  return `
    <div class="timeline" data-testid="timeline">
      <div class="timeline-line"></div>
      ${pins}
      <p class="timeline-note">· · · ${esc(spec.timeline.note)} · · ·</p>
    </div>`;
}

function sealedHint(chronicle: ChronicleDef): string {
  if (chronicle.unlock === 'run-end') return 'Opens at the end of a stewardship.';
  if (chronicle.unlock === 'lens') return "Opens with the Physician's Lens.";
  return '';
}

function pageListHtml(state: AppState): string {
  const spec = state.spec;
  const p = state.persistent;
  return spec.chronicles
    .map((chronicle) => {
      const opened = p.chroniclesOpened.includes(chronicle.id);
      if (!opened) {
        const hint = sealedHint(chronicle);
        return `
          <div class="chron-row chron-sealed">
            <span class="chron-glyph"><span class="lock-seal"></span></span>
            <span class="chron-body">
              <span class="chron-label">${esc(chronicle.dates)} · Sealed</span>
              <span class="chron-title">${esc(chronicle.title)}</span>
              ${hint ? `<span class="chron-hint">${esc(hint)}</span>` : ''}
            </span>
          </div>`;
      }
      const current = state.chronicleId === chronicle.id;
      const read = p.chroniclesRead.includes(chronicle.id);
      const record = p.quiz[chronicle.id];
      const dot = record && needsReviewDot(record);
      return `
        <button class="chron-row chron-open ${current ? 'chron-current' : ''}" data-action="chronicle-select" data-id="${chronicle.id}" data-testid="chron-row-${chronicle.id}">
          <span class="chron-glyph"></span>
          <span class="chron-body">
            <span class="chron-label">${esc(chronicle.dates)}${current ? ' · Open now' : ''}</span>
            <span class="chron-title">${esc(chronicle.title)}</span>
          </span>
          ${read ? '<span class="chron-read">Read</span>' : ''}
          ${dot ? '<span class="review-dot" data-testid="review-dot"></span>' : ''}
        </button>`;
    })
    .join('');
}

function quizHtml(state: AppState, chronicle: ChronicleDef): string {
  const p = state.persistent;
  const record = p.quiz[chronicle.id] ?? createQuizRecord(chronicle.quiz.length);
  const picked = state.chronicleQuiz?.picked ?? null;
  const forIndex = state.chronicleQuiz?.forIndex ?? null;
  const index =
    picked !== null && forIndex !== null ? forIndex : record.correct.findIndex((done) => !done);
  if (index === -1) {
    return `
      <div class="quiz" data-testid="quiz">
        <p class="quiz-done">Both questions answered. Well read.</p>
        <button class="quiet" data-action="quiz-close" data-testid="quiz-close">Close</button>
      </div>`;
  }
  const question = chronicle.quiz[index]!;
  const options = question.options
    .map((option, i) => {
      let cls = '';
      if (picked !== null) {
        if (i === question.answer) cls = 'option-right';
        else if (i === picked) cls = 'option-wrong';
      }
      return `<button class="quiz-option ${cls}" data-action="quiz-answer" data-index="${i}" data-testid="quiz-option-${i}">${esc(option)}</button>`;
    })
    .join('');
  const feedback =
    picked !== null
      ? `<p class="quiz-explain">${esc(question.explain)}</p>
         <button class="quiet" data-action="quiz-continue" data-testid="quiz-continue">${
           picked === question.answer ? 'Next' : 'Try again'
         }</button>`
      : '';
  return `
    <div class="quiz" data-testid="quiz">
      <p class="label">Question ${index + 1} of ${chronicle.quiz.length}</p>
      <p class="quiz-q">${esc(question.q)}</p>
      <div class="quiz-options">${options}</div>
      ${feedback}
    </div>`;
}

function chroniclePage(state: AppState, chronicle: ChronicleDef, codex: Map<string, CodexEntry>): string {
  const body = chronicle.body
    .split('\n\n')
    .map((paragraph) => `<p>${renderCopy(paragraph, codex)}</p>`)
    .join('');
  const remember = `
    <div class="remember">
      <span class="remember-tag">Remember this</span>
      <ul>${chronicle.remember.map((item) => `<li>${renderCopy(item, codex)}</li>`).join('')}</ul>
    </div>`;
  const quizOpen = state.chronicleQuiz?.open ?? false;
  const footer = quizOpen
    ? ''
    : `<footer class="chron-foot">
        <button class="quiet" data-action="chronicle-quiz" data-testid="chronicle-quiz">Two questions to check what you read</button>
        <button class="quiet" data-action="chronicle-next" data-testid="chronicle-next">Next page →</button>
      </footer>`;
  return `
    <p class="label">A chronicle · ${esc(chronicle.dates)}</p>
    <h2 class="chronicle-title">${esc(chronicle.title)}</h2>
    <div class="chronicle-body">${body}</div>
    ${remember}
    ${quizOpen ? quizHtml(state, chronicle) : ''}
    ${footer}`;
}

export function chroniclesHtml(state: AppState, codex: Map<string, CodexEntry>): string {
  const current =
    state.spec.chronicles.find((c) => c.id === state.chronicleId) ??
    state.spec.chronicles.find((c) => state.persistent.chroniclesOpened.includes(c.id)) ??
    null;
  return `
    <div class="screen-column">
      ${timelineHtml(state)}
      <div class="spread chron-spread">
        <section class="leaf leaf-left chron-left">${pageListHtml(state)}</section>
        <div class="spine"></div>
        <section class="leaf leaf-right chron-right" data-testid="chronicle-page">
          ${current ? chroniclePage(state, current, codex) : '<p class="empty">No chronicle open yet.</p>'}
        </section>
      </div>
    </div>`;
}
