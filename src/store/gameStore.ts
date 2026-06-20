import { create } from 'zustand';
import type { Challenge } from '../data/mockChallenges';
import type { Student } from '../data/mockStudents';

export type SpotlightMode =
  | 'student'
  | 'headToHead'
  | 'closestToLaunch'
  | 'comeback'
  | 'latestSolve';

export interface ScoreSnapshot {
  score: number;
  timestamp: number;
}

export interface LatestSolve {
  studentId: string;
  alias: string;
  missionTitle: string;
  timeTaken: number; // seconds
  points: number;
}

export interface LiveCodeFeed {
  studentId: string;
  alias?: string;
  code: string;
  mission: string;
  cursorLine: number;
}

interface GameState {
  sessionStatus: 'waiting' | 'active' | 'ended';
  currentChallenge: Challenge | null;
  students: Student[];
  myScore: number;
  myPiecesUnlocked: number;
  customChallenges: Challenge[] | null;

  // Spotlight (Phase B)
  spotlightMode: SpotlightMode;
  spotlightTarget: string | [string, string] | null;
  spotlightOverride: { mode: SpotlightMode; target: string | [string, string] } | null;
  latestSolve: LatestSolve | null;
  scoreHistory: Record<string, ScoreSnapshot[]>; // rolling 2-min window per student
  
  // Live Code (Phase C)
  liveCodeFeed: LiveCodeFeed | null;

  // Actions
  setSessionStatus: (status: 'waiting' | 'active' | 'ended') => void;
  setChallenge: (challenge: Challenge) => void;
  updateScore: (points: number) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  setStudents: (students: Student[]) => void;
  setCustomChallenges: (challenges: Challenge[]) => void;
  unlockPiece: () => void;
  setSpotlight: (mode: SpotlightMode, target: string | [string, string] | null) => void;
  setSpotlightOverride: (override: { mode: SpotlightMode; target: string | [string, string] } | null) => void;
  recordLatestSolve: (solve: LatestSolve) => void;
  pushScoreSnapshot: (studentId: string, score: number) => void;
  setLiveCodeFeed: (feed: LiveCodeFeed | null) => void;
  reset: () => void;
}

const TWO_MINUTES = 2 * 60 * 1000;

export const useGameStore = create<GameState>((set) => ({
  sessionStatus: 'waiting',
  currentChallenge: null,
  students: [],
  myScore: 0,
  myPiecesUnlocked: 0,
  customChallenges: null,

  // Spotlight defaults
  spotlightMode: 'student',
  spotlightTarget: null,
  spotlightOverride: null,
  latestSolve: null,
  scoreHistory: {},
  
  // Live Code defaults
  liveCodeFeed: null,

  setSessionStatus: (sessionStatus) => set({ sessionStatus }),
  setChallenge: (currentChallenge) => set({ currentChallenge }),
  updateScore: (points) => set((s) => ({ myScore: s.myScore + points })),
  updateStudent: (id, updates) =>
    set((s) => ({
      students: s.students.map((st) => (st.id === id ? { ...st, ...updates } : st)),
    })),
  setStudents: (students) => set({ students }),
  setCustomChallenges: (customChallenges) => set({ customChallenges }),
  unlockPiece: () => set((s) => ({ myPiecesUnlocked: s.myPiecesUnlocked + 1 })),

  setSpotlight: (spotlightMode, spotlightTarget) => set({ spotlightMode, spotlightTarget }),
  setSpotlightOverride: (spotlightOverride) => set({ spotlightOverride }),

  recordLatestSolve: (latestSolve) => set({ latestSolve }),

  pushScoreSnapshot: (studentId, score) =>
    set((s) => {
      const now = Date.now();
      const prev = s.scoreHistory[studentId] ?? [];
      const trimmed = prev.filter((snap) => now - snap.timestamp < TWO_MINUTES);
      return {
        scoreHistory: {
          ...s.scoreHistory,
          [studentId]: [...trimmed, { score, timestamp: now }],
        },
      };
    }),
    
  setLiveCodeFeed: (liveCodeFeed) => set({ liveCodeFeed }),

  reset: () =>
    set({
      sessionStatus: 'waiting',
      currentChallenge: null,
      students: [],
      myScore: 0,
      myPiecesUnlocked: 0,
      spotlightMode: 'student',
      spotlightTarget: null,
      spotlightOverride: null,
      latestSolve: null,
      scoreHistory: {},
      liveCodeFeed: null,
    }),
}));
