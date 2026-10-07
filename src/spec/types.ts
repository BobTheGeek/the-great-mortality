export interface SpecMeta {
  id: string;
  title: string;
  version: string;
  archetype: string;
  curriculum: string;
  markup: string;
  historicalBenchmark: { survival: number; label: string; caption: string };
}

export interface DecreeEffect {
  unrestOnIssue?: number;
  ratKill?: number;
  ongoing?: number;
  crowdMultiplier?: number;
}

export interface SimConfig {
  months: number;
  startCalendarMonth: number;
  ticksPerMonth: number;
  decreesPerMonth: number;
  portTown: string;
  isolatedTown: string;
  season: number[];
  ratDensity: Record<string, number>;
  rats: { beta: number; deathRate: number; visibleDieOff: number };
  humans: {
    ratFleaForce: number;
    humanFleaForce: number;
    pneumonicForce: number;
    pneumonicShare: number;
    pneumonicShareWinter: number;
    bubonicFatality: number;
    coughingVisible: number;
  };
  monasteryCrowding: number;
  ships: {
    earlyMonths: number;
    infectedEarly: number;
    infectedLate: number;
    heldLeak: number;
    ratSeed: number;
    sickSailors: number;
    grainShipShare: number;
  };
  overland: {
    fromMonth: number;
    entryTown: string;
    monthlyChance: number;
    ratSeed: number;
    people: number;
  };
  roads: { seedChance: number; peopleWeight: number; ratSeed: number };
  events: { ragmanChance: number };
  isolatedClue: { fromMonth: number; minInfectedTowns: number };
  winterLull: { minPeak: number; drop: number };
  economy: {
    startTreasury: number;
    tithePerPerson: number;
    sealedTitheShare: number;
    tollsOpen: number;
    tollsHeld: number;
  };
  unrest: {
    start: number;
    decayPerMonth: number;
    perDeathRate: number;
    portClosedPerMonth: number;
    shipsHeldPerMonth: number;
    sealedPerTownPerMonth: number;
    deathCapPerMonth: number;
  };
  decreeEffects: Record<string, DecreeEffect>;
  assist: {
    afterStewardships: number;
    deadRatsDieOff: number;
    deadRatsMaxBuriedShare: number;
    coughingVisible: number;
    ragmanChance: number;
  };
}

export interface TownDef {
  id: string;
  name: string;
  type: string;
  pop: number;
  founded: number;
  label: string;
}

export interface RouteDef {
  id: string;
  a: string;
  b: string;
  trade: number;
  kind: string;
}

export interface DecreeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  target: string;
  kind: string;
  truth: string;
}

export interface Opening {
  label: string;
  narration: string[];
  titleCard: { kicker: string; title: string; body: string };
  namePool: string[];
}

export interface UnrestBand {
  min: number;
  max: number;
  word: string;
}

export interface AdvisorDef {
  id: string;
  name: string;
  stance: string;
  theories: string[];
  offers: string[];
  lines: Record<string, string[]>;
}

export interface TheoryDef {
  id: string;
  text: string;
  advisor?: string;
  religious?: boolean;
  correct?: boolean;
}

export interface SolveRule {
  all: string[];
  anyOf: string[];
  need: number;
}

export interface QuestionDef {
  id: string;
  numeral: string;
  text: string;
  theories: TheoryDef[];
  solveRule: SolveRule;
  notYetHint: string;
  solvedSummary: string;
}

export interface VerdictCopy {
  stamp: string;
  text?: string;
  button: string;
  religiousText?: string;
  noClueText?: string;
}

export interface MysteryVerdicts {
  solved: VerdictCopy;
  notYet: VerdictCopy;
  wrong: VerdictCopy;
}

export interface ClueDef {
  id: string;
  title: string;
  text: string;
  questions: string[];
  for: string[];
  against: string[];
  trigger: string;
  reportText?: string;
}

export interface LensLegendRow {
  id: string;
  title: string;
  text: string;
}

export interface LensReveal {
  kicker: string;
  title: string;
  body: string;
  chips: string[];
  button: string;
  footnote: string;
  legend: LensLegendRow[];
}

export interface Mystery {
  questions: QuestionDef[];
  verdicts: MysteryVerdicts;
  clues: ClueDef[];
  lensReveal: LensReveal;
}

export interface CodexEntry {
  id: string;
  term: string;
  pos: string;
  meaning: string;
  why: string;
  then?: string;
  now?: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface ChronicleDef {
  id: string;
  title: string;
  dates: string;
  pinYear: number;
  unlock: string;
  body: string;
  remember: string[];
  quiz: QuizQuestion[];
}

export interface Timeline {
  start: number;
  end: number;
  note: string;
  pins: string[];
}

export interface CardDef {
  id: string;
  numeral: string;
  myth: string;
  verdict: string;
  story: string;
  howWeKnow: string;
  earn: string;
  caption: string;
}

export interface EpithetDef {
  id: string;
  name: string;
  rule: string;
  citation: string;
}

export interface Epithets {
  order: string[];
  list: EpithetDef[];
  actionPhrases: Record<string, string>;
  actionPhraseRule: string;
}

export interface ScriptedEventDef {
  id: string;
  fromMonth: number;
  untilMonth?: number;
  requiresTownInfected?: string;
  unrest?: number;
  place: string;
  title: string;
  paragraphs: string[];
  stewardAction: string;
  footer: string;
  button: string;
}

export interface Endings {
  normal: {
    kicker: string;
    title: string;
    benchmarkLabel: string;
    benchmarkValue: string;
    benchmarkCaption: string;
  };
  overthrown: { title: string; body: string; footnote: string };
  fled: { title: string; body: string; footnote: string };
}

export interface EpithetRules {
  ironGateMonths: number;
  devoutProcessions: number;
  wiseSurvival: number;
  wiseMinQuarantineMonths: number;
  steadyMaxUnrest: number;
  benchmarkSurvival: number;
  unluckyMinEffective: number;
}

export interface Spec {
  meta: SpecMeta;
  sim: SimConfig;
  towns: TownDef[];
  routes: RouteDef[];
  decrees: DecreeDef[];
  unlockOnDecree: Record<string, string[]>;
  opening: Opening;
  unrestBands: UnrestBand[];
  monthFlavors?: string[];
  quietReportLines?: string[];
  advisors: AdvisorDef[];
  mystery: Mystery;
  codex: CodexEntry[];
  chronicles: ChronicleDef[];
  timeline: Timeline;
  cards: CardDef[];
  epithets: Epithets;
  scriptedEvents: ScriptedEventDef[];
  reportLines: Record<string, string>;
  endings: Endings;
  epithetRules: EpithetRules;
}
