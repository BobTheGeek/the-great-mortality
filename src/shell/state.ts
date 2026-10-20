export interface QuizRecord {
  answeredCount: number[];
  firstTryCorrect: boolean[];
  correct: boolean[];
}

export interface CardMeta {
  month: number;
  town?: string;
  run: number;
}

export interface PersistentState {
  mysterySolved: string[];
  cluesFound: string[];
  codexSeen: string[];
  codexRead: string[];
  chroniclesOpened: string[];
  chroniclesRead: string[];
  quiz: Record<string, QuizRecord>;
  cardsEarned: string[];
  cardsFlipped: string[];
  cardMeta: Record<string, CardMeta>;
  epithetsEarned: string[];
  lensUnlocked: boolean;
  assistMissCounts: Record<string, number>;
  a2hsDismissed: boolean;
  a2hsWarned: boolean;
  howToPlaySeen: boolean;
  runsCompleted: number;
}

export function createPersistentState(): PersistentState {
  return {
    mysterySolved: [],
    cluesFound: [],
    codexSeen: [],
    codexRead: [],
    chroniclesOpened: [],
    chroniclesRead: [],
    quiz: {},
    cardsEarned: [],
    cardsFlipped: [],
    cardMeta: {},
    epithetsEarned: [],
    lensUnlocked: false,
    assistMissCounts: {},
    a2hsDismissed: false,
    a2hsWarned: false,
    howToPlaySeen: false,
    runsCompleted: 0,
  };
}

export interface JournalEntry {
  month: number;
  kind: 'clue' | 'event' | 'decree';
  refId: string;
  townId?: string;
  fromTownId?: string;
}

export interface RunJournal {
  entries: JournalEntry[];
}

export function createJournal(): RunJournal {
  return { entries: [] };
}
