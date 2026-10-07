export interface QuizRecord {
  attempts: number;
  correctFirstTry: boolean;
  needsReview: boolean;
  completed: boolean;
}

export interface PersistentState {
  mysterySolved: string[];
  cluesFound: string[];
  codexSeen: string[];
  chroniclesOpened: string[];
  quiz: Record<string, QuizRecord>;
  cardsEarned: string[];
  epithetsEarned: string[];
  lensUnlocked: boolean;
  assistMissCounts: Record<string, number>;
  a2hsDismissed: boolean;
  runsCompleted: number;
}

export function createPersistentState(): PersistentState {
  return {
    mysterySolved: [],
    cluesFound: [],
    codexSeen: [],
    chroniclesOpened: [],
    quiz: {},
    cardsEarned: [],
    epithetsEarned: [],
    lensUnlocked: false,
    assistMissCounts: {},
    a2hsDismissed: false,
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
