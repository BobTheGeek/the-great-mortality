import { collectPlaceholders, collectTermRefs } from './markup';
import type { Spec } from './types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export class SpecValidationError extends Error {
  readonly result: ValidationResult;

  constructor(result: ValidationResult) {
    super(['Spec validation failed:', ...result.errors].join('\n'));
    this.name = 'SpecValidationError';
    this.result = result;
  }
}

const KNOWN_PLACEHOLDERS = new Set([
  'town',
  'steward',
  'month',
  'income',
  'n',
  'from',
  'to',
  'actions',
]);

function isStr(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function walkStrings(
  value: unknown,
  path: string,
  visit: (text: string, path: string) => void,
): void {
  if (typeof value === 'string') {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, `${path}[${index}]`, visit));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walkStrings(child, path ? `${path}.${key}` : key, visit);
    }
  }
}

export function validateSpec(spec: Spec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (message: string) => {
    errors.push(message);
  };
  const warn = (message: string) => {
    warnings.push(message);
  };

  const townIds = new Set<string>();
  const decreeIds = new Set<string>();
  const codexIds = new Set<string>();
  const clueIds = new Set<string>();
  const questionIds = new Set<string>();
  const theoryIds = new Set<string>();
  const advisorIds = new Set<string>();
  const chronicleIds = new Set<string>();
  const cardIds = new Set<string>();
  const eventIds = new Set<string>();

  const collect = (ids: string[], set: Set<string>, label: string) => {
    const seen = new Set<string>();
    ids.forEach((id) => {
      if (!isStr(id)) {
        err(`${label}: every entry needs a non-empty id`);
        return;
      }
      if (seen.has(id)) err(`${label}: duplicate id "${id}"`);
      seen.add(id);
      set.add(id);
    });
  };

  collect((spec.towns ?? []).map((t) => t.id), townIds, 'towns');
  collect((spec.decrees ?? []).map((d) => d.id), decreeIds, 'decrees');
  collect((spec.codex ?? []).map((c) => c.id), codexIds, 'codex');
  collect((spec.mystery?.clues ?? []).map((c) => c.id), clueIds, 'mystery.clues');
  collect((spec.mystery?.questions ?? []).map((q) => q.id), questionIds, 'mystery.questions');
  collect(
    (spec.mystery?.questions ?? []).flatMap((q) => q.theories.map((t) => t.id)),
    theoryIds,
    'mystery.theories',
  );
  collect((spec.advisors ?? []).map((a) => a.id), advisorIds, 'advisors');
  collect((spec.chronicles ?? []).map((c) => c.id), chronicleIds, 'chronicles');
  collect((spec.cards ?? []).map((c) => c.id), cardIds, 'cards');
  collect((spec.scriptedEvents ?? []).map((e) => e.id), eventIds, 'scriptedEvents');

  if (!isStr(spec.meta?.id) || !isStr(spec.meta?.title) || !isStr(spec.meta?.version)) {
    err('meta: id, title and version are required');
  }

  const sim = spec.sim;
  if (!(typeof sim?.months === 'number' && sim.months > 0)) {
    err('sim.months must be a positive number');
  }
  if (!(typeof sim?.startCalendarMonth === 'number' && sim.startCalendarMonth >= 0 && sim.startCalendarMonth <= 11)) {
    err('sim.startCalendarMonth must be between 0 and 11');
  }
  if (!(typeof sim?.decreesPerMonth === 'number' && sim.decreesPerMonth >= 0)) {
    err('sim.decreesPerMonth must be a number >= 0');
  }
  if (!townIds.has(sim?.portTown)) err(`sim.portTown "${sim?.portTown}" is not a town`);
  if (!townIds.has(sim?.isolatedTown)) err(`sim.isolatedTown "${sim?.isolatedTown}" is not a town`);
  if ((sim?.season ?? []).length !== 12) err('sim.season must have 12 entries');
  (spec.towns ?? []).forEach((t) => {
    if (typeof sim?.ratDensity?.[t.type] !== 'number') {
      err(`sim.ratDensity["${t.type}"] is required for town "${t.id}"`);
    }
  });
  Object.keys(sim?.decreeEffects ?? {}).forEach((id) => {
    if (!decreeIds.has(id)) err(`sim.decreeEffects: unknown decree "${id}"`);
  });

  (spec.towns ?? []).forEach((t, i) => {
    const path = `towns[${t.id ?? i}]`;
    if (!isStr(t.name)) err(`${path}: name required`);
    if (!isStr(t.type)) err(`${path}: type required`);
    if (!(typeof t.pop === 'number' && t.pop > 0)) err(`${path}: pop must be positive`);
  });

  (spec.routes ?? []).forEach((r, i) => {
    const path = `routes[${r.id ?? i}]`;
    if (!townIds.has(r.a) || !townIds.has(r.b)) err(`${path}: route towns must exist`);
    if (r.a === r.b) err(`${path}: a route cannot connect a town to itself`);
    if (!(typeof r.trade === 'number' && r.trade >= 0 && r.trade <= 1)) {
      err(`${path}: trade must be between 0 and 1`);
    }
    if (!['road', 'footpath'].includes(r.kind)) err(`${path}: unknown kind "${r.kind}"`);
  });

  (spec.decrees ?? []).forEach((d, i) => {
    const path = `decrees[${d.id ?? i}]`;
    if (!isStr(d.name) || !isStr(d.description)) err(`${path}: name and description required`);
    if (!(typeof d.cost === 'number' && d.cost >= 0)) err(`${path}: cost must be a number >= 0`);
    if (!['port', 'town', 'region'].includes(d.target)) err(`${path}: unknown target "${d.target}"`);
    if (!['toggle', 'one-time', 'instant', 'ends-run'].includes(d.kind)) {
      err(`${path}: unknown kind "${d.kind}"`);
    }
  });
  if (!decreeIds.has('flee')) warn('decrees: no flee decree found');

  const bands = [...(spec.unrestBands ?? [])].sort((a, b) => a.min - b.min);
  if (!bands.length) {
    err('unrestBands: at least one band is required');
  } else {
    let expected = 0;
    bands.forEach((band) => {
      if (band.min !== expected) {
        err(`unrestBands: bands must cover 0..100 with no gaps (expected min ${expected}, found ${band.min})`);
      }
      if (!isStr(band.word)) err(`unrestBands: band ${band.min}-${band.max} needs a word`);
      expected = band.max + 1;
    });
    if (expected < 100) {
      err(`unrestBands: bands must cover 0..100 with no gaps (last band ends at ${expected - 1})`);
    }
  }

  (spec.advisors ?? []).forEach((a, i) => {
    const path = `advisors[${a.id ?? i}]`;
    (a.theories ?? []).forEach((t) => {
      if (!theoryIds.has(t)) err(`${path}: unknown theory "${t}"`);
    });
    (a.offers ?? []).forEach((offer) => {
      const decreeId = offer.startsWith('lift:') ? offer.slice(5) : offer;
      if (!decreeIds.has(decreeId)) err(`${path}: unknown decree "${decreeId}"`);
    });
    if (!Array.isArray(a.lines?.early) || !a.lines.early.length) {
      err(`${path}: an "early" line is required`);
    }
    Object.entries(a.lines ?? {}).forEach(([kind, lines]) => {
      (lines ?? []).forEach((line) => {
        if (!isStr(line)) err(`${path}.lines.${kind}: empty line`);
      });
    });
  });

  const questions = spec.mystery?.questions ?? [];
  if (questions.length !== 4) {
    err(`mystery.questions: exactly 4 questions are required (found ${questions.length})`);
  }
  questions.forEach((q, i) => {
    const path = `mystery.questions[${q.id ?? i}]`;
    if (!isStr(q.text)) err(`${path}: text required`);
    if (!isStr(q.numeral)) err(`${path}: numeral required`);
    if ((q.theories ?? []).length !== 4) {
      err(`${path}: exactly 4 theories are required (found ${q.theories?.length ?? 0})`);
    }
    const correct = (q.theories ?? []).filter((t) => t.correct === true).length;
    if (correct !== 1) {
      err(`${path}: exactly one correct theory is required (found ${correct})`);
    }
    (q.solveRule?.all ?? []).forEach((clue) => {
      if (!clueIds.has(clue)) err(`${path}.solveRule: unknown clue "${clue}"`);
    });
    (q.solveRule?.anyOf ?? []).forEach((clue) => {
      if (!clueIds.has(clue)) err(`${path}.solveRule: unknown clue "${clue}"`);
    });
    const need = q.solveRule?.need ?? 0;
    if (!(typeof need === 'number' && need >= 0 && need <= (q.solveRule?.anyOf ?? []).length)) {
      err(`${path}.solveRule: need ${need} is not satisfiable`);
    }
    if (!isStr(q.notYetHint)) err(`${path}: notYetHint required`);
    if (!isStr(q.solvedSummary)) err(`${path}: solvedSummary required`);
  });

  (spec.mystery?.clues ?? []).forEach((c, i) => {
    const path = `mystery.clues[${c.id ?? i}]`;
    if (!isStr(c.title) || !isStr(c.text)) err(`${path}: title and text required`);
    if (!isStr(c.trigger)) err(`${path}: trigger required`);
    (c.questions ?? []).forEach((q) => {
      if (!questionIds.has(q)) err(`${path}: unknown question "${q}"`);
    });
    (c.for ?? []).forEach((t) => {
      if (!theoryIds.has(t)) err(`${path}.for: unknown theory "${t}"`);
    });
    (c.against ?? []).forEach((t) => {
      if (!theoryIds.has(t)) err(`${path}.against: unknown theory "${t}"`);
    });
  });

  const verdicts = spec.mystery?.verdicts;
  if (!isStr(verdicts?.solved?.stamp) || !isStr(verdicts?.solved?.button)) {
    err('mystery.verdicts.solved: stamp and button required');
  }
  if (!isStr(verdicts?.notYet?.stamp) || !isStr(verdicts?.notYet?.text) || !isStr(verdicts?.notYet?.button)) {
    err('mystery.verdicts.notYet: stamp, text and button required');
  }
  if (
    !isStr(verdicts?.wrong?.stamp) ||
    !isStr(verdicts?.wrong?.text) ||
    !isStr(verdicts?.wrong?.religiousText) ||
    !isStr(verdicts?.wrong?.noClueText) ||
    !isStr(verdicts?.wrong?.button)
  ) {
    err('mystery.verdicts.wrong: stamp, text, religiousText, noClueText and button required');
  }

  const lens = spec.mystery?.lensReveal;
  if (!isStr(lens?.kicker) || !isStr(lens?.title) || !isStr(lens?.body) || !isStr(lens?.button) || !isStr(lens?.footnote)) {
    err('mystery.lensReveal: kicker, title, body, button and footnote required');
  }
  if (!(lens?.chips ?? []).length) err('mystery.lensReveal.chips: at least one chip is required');
  (lens?.legend ?? []).forEach((row, i) => {
    if (!isStr(row.id) || !isStr(row.title) || !isStr(row.text)) {
      err(`mystery.lensReveal.legend[${i}]: id, title and text required`);
    }
  });

  (spec.codex ?? []).forEach((c, i) => {
    const path = `codex[${c.id ?? i}]`;
    if (!isStr(c.term) || !isStr(c.pos) || !isStr(c.meaning) || !isStr(c.why)) {
      err(`${path}: term, pos, meaning and why required`);
    }
  });

  (spec.chronicles ?? []).forEach((c, i) => {
    const path = `chronicles[${c.id ?? i}]`;
    if (!isStr(c.title) || !isStr(c.dates) || !isStr(c.body)) {
      err(`${path}: title, dates and body required`);
    }
    if (!Number.isInteger(c.pinYear)) err(`${path}: pinYear must be an integer`);
    const unlock = c.unlock ?? '';
    if (unlock === 'opening' || unlock === 'run-end' || unlock === 'lens') {
      // content-free unlocks
    } else if (unlock.startsWith('event:')) {
      const id = unlock.slice(6);
      if (!eventIds.has(id)) err(`${path}.unlock: unknown event "${id}"`);
    } else if (unlock.startsWith('clue:')) {
      const id = unlock.slice(5);
      if (!clueIds.has(id)) err(`${path}.unlock: unknown clue "${id}"`);
    } else {
      err(`${path}.unlock: unrecognized unlock "${unlock}"`);
    }
    if ((c.quiz ?? []).length !== 2) {
      err(`${path}.quiz: exactly 2 questions are required (found ${c.quiz?.length ?? 0})`);
    }
    (c.quiz ?? []).forEach((quiz, qi) => {
      if (!isStr(quiz.q)) err(`${path}.quiz[${qi}]: question required`);
      if (!(quiz.options ?? []).length) err(`${path}.quiz[${qi}]: options required`);
      if (!(typeof quiz.answer === 'number' && quiz.answer >= 0 && quiz.answer < (quiz.options ?? []).length)) {
        err(`${path}.quiz[${qi}]: answer index out of range`);
      }
      if (!isStr(quiz.explain)) err(`${path}.quiz[${qi}]: explain required`);
    });
    if (!(c.remember ?? []).length) err(`${path}: remember list required`);
  });

  (spec.timeline?.pins ?? []).forEach((pin) => {
    if (!chronicleIds.has(pin)) err(`timeline.pins: unknown chronicle "${pin}"`);
  });
  const pinned = new Set(spec.timeline?.pins ?? []);
  chronicleIds.forEach((id) => {
    if (!pinned.has(id)) err(`timeline.pins: chronicle "${id}" has no pin`);
  });

  (spec.cards ?? []).forEach((c, i) => {
    const path = `cards[${c.id ?? i}]`;
    if (!isStr(c.numeral) || !isStr(c.myth) || !isStr(c.story) || !isStr(c.howWeKnow)) {
      err(`${path}: numeral, myth, story and howWeKnow required`);
    }
    if (!['busted', 'partly-true'].includes(c.verdict)) {
      err(`${path}: unknown verdict "${c.verdict}"`);
    }
    const [kind, ...rest] = (c.earn ?? '').split(':');
    const ref = rest[0];
    if (kind === 'decree') {
      if (!decreeIds.has(ref)) err(`${path}.earn: unknown decree "${ref}"`);
    } else if (kind === 'clue') {
      if (!clueIds.has(ref)) err(`${path}.earn: unknown clue "${ref}"`);
    } else if (kind === 'solved') {
      if (!questionIds.has(ref)) err(`${path}.earn: unknown question "${ref}"`);
    } else if (kind === 'advisor') {
      if (!advisorIds.has(ref)) err(`${path}.earn: unknown advisor "${ref}"`);
    } else if (kind !== 'run-end' && kind !== 'town-burned-out' && kind !== 'lens') {
      err(`${path}.earn: unrecognized earn rule "${c.earn}"`);
    }
  });

  const order = spec.epithets?.order ?? [];
  const epithetList = spec.epithets?.list ?? [];
  const epithetListIds = new Set(epithetList.map((e) => e.id));
  if (order.length !== epithetList.length || order.some((id) => !epithetListIds.has(id))) {
    err('epithets.order must list every epithet exactly once');
  }
  epithetList.forEach((epithet) => {
    if (!isStr(epithet.name)) err(`epithets[${epithet.id}]: name required`);
    if (!isStr(epithet.citation)) err(`epithets[${epithet.id}]: citation required`);
  });
  if (!isStr(spec.epithets?.actionPhraseRule)) err('epithets.actionPhraseRule required');
  if (!isStr(spec.epithets?.actionPhrases?.none)) err('epithets.actionPhrases: "none" phrase required');
  (['ironGateMonths', 'devoutProcessions', 'wiseSurvival', 'wiseMinQuarantineMonths', 'steadyMaxUnrest', 'benchmarkSurvival', 'unluckyMinEffective'] as const).forEach((key) => {
    if (typeof spec.epithetRules?.[key] !== 'number') err(`epithetRules.${key} must be a number`);
  });

  const months = sim?.months ?? 18;
  (spec.scriptedEvents ?? []).forEach((e, i) => {
    const path = `scriptedEvents[${e.id ?? i}]`;
    if (!isStr(e.title) || !isStr(e.place) || !isStr(e.stewardAction) || !isStr(e.footer) || !isStr(e.button)) {
      err(`${path}: title, place, stewardAction, footer and button required`);
    }
    if (!(typeof e.fromMonth === 'number' && e.fromMonth >= 0 && e.fromMonth < months)) {
      err(`${path}: fromMonth out of range`);
    }
    if (e.untilMonth != null && (e.untilMonth < e.fromMonth || e.untilMonth >= months)) {
      err(`${path}: untilMonth out of range`);
    }
    if (e.requiresTownInfected && !townIds.has(e.requiresTownInfected)) {
      err(`${path}: unknown town "${e.requiresTownInfected}"`);
    }
    if (!(e.paragraphs ?? []).length) err(`${path}: paragraphs required`);
  });

  Object.entries(spec.unlockOnDecree ?? {}).forEach(([decreeId, tokens]) => {
    if (!decreeIds.has(decreeId)) err(`unlockOnDecree: unknown decree "${decreeId}"`);
    (tokens ?? []).forEach((token) => {
      const [kind, ref] = token.split(':');
      if (kind === 'card') {
        if (!cardIds.has(ref)) err(`unlockOnDecree[${decreeId}]: unknown card "${ref}"`);
      } else {
        err(`unlockOnDecree[${decreeId}]: unrecognized unlock "${token}"`);
      }
    });
  });

  if (!isStr(spec.opening?.titleCard?.kicker) || !isStr(spec.opening?.titleCard?.title) || !isStr(spec.opening?.titleCard?.body)) {
    err('opening.titleCard: kicker, title and body required');
  }
  if (!(spec.opening?.narration ?? []).length) err('opening.narration: at least one line required');
  if ((spec.opening?.namePool ?? []).length < 4) err('opening.namePool: at least four names required');

  const endings = spec.endings;
  if (
    !isStr(endings?.normal?.kicker) ||
    !isStr(endings?.normal?.title) ||
    !isStr(endings?.normal?.benchmarkLabel) ||
    !isStr(endings?.normal?.benchmarkValue) ||
    !isStr(endings?.normal?.benchmarkCaption)
  ) {
    err('endings.normal: all fields required');
  }
  (['overthrown', 'fled'] as const).forEach((kind) => {
    const ending = endings?.[kind];
    if (!isStr(ending?.title) || !isStr(ending?.body) || !isStr(ending?.footnote)) {
      err(`endings.${kind}: title, body and footnote required`);
    }
  });

  if (spec.monthFlavors !== undefined) {
    if (!Array.isArray(spec.monthFlavors) || spec.monthFlavors.length !== 12) {
      err(`monthFlavors: expected 12 entries (calendar months), found ${spec.monthFlavors?.length ?? 0}`);
    } else {
      spec.monthFlavors.forEach((flavor, i) => {
        if (!isStr(flavor)) err(`monthFlavors[${i}]: empty`);
      });
    }
  }
  if (spec.quietReportLines !== undefined) {
    if (!Array.isArray(spec.quietReportLines) || !spec.quietReportLines.length) {
      err('quietReportLines: at least one line is required');
    } else {
      spec.quietReportLines.forEach((line, i) => {
        if (!isStr(line)) err(`quietReportLines[${i}]: empty`);
      });
    }
  }

  Object.entries(spec as unknown as Record<string, unknown>).forEach(([key, value]) => {
    if (key === 'meta') return;
    walkStrings(value, `spec.${key}`, (text, path) => {
      collectTermRefs(text).forEach((term) => {
        if (!codexIds.has(term)) err(`markup: unknown codex term "${term}" in ${path}`);
      });
      collectPlaceholders(text).forEach((placeholder) => {
        if (!KNOWN_PLACEHOLDERS.has(placeholder)) {
          err(`placeholder: unknown placeholder "{${placeholder}}" in ${path}`);
        }
      });
    });
  });

  return { ok: errors.length === 0, errors, warnings };
}

export function assertValidSpec(spec: Spec): void {
  const result = validateSpec(spec);
  if (!result.ok) throw new SpecValidationError(result);
}
