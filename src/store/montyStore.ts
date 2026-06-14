import { create } from 'zustand';
import { montyDialog } from '../data/montyDialog';

export type MontyState = 'idle' | 'thinking' | 'happy' | 'celebrating' | 'sad' | 'hint';

interface MontyStoreState {
  cockpitState: MontyState;
  cockpitLine: string | null;
  narratorLine: string | null;
  setCockpitState: (state: MontyState) => void;
  setCockpitLine: (line: string | null) => void;
  setNarratorLine: (line: string | null) => void;
  trigger: (eventType: string, params?: Record<string, string>) => void;
  clearLine: () => void;
}

const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const substitute = (template: string, params: Record<string, string> = {}) =>
  template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);

const stateForEvent: Record<string, MontyState> = {
  onboarding: 'idle',
  challenge_start: 'happy',
  hint: 'hint',
  stuck_90s: 'thinking',
  success: 'celebrating',
  fail: 'sad',
  lobby: 'idle',
};

export const useMontyStore = create<MontyStoreState>((set) => ({
  cockpitState: 'idle',
  cockpitLine: null,
  narratorLine: null,
  setCockpitState: (cockpitState) => set({ cockpitState }),
  setCockpitLine: (cockpitLine) => set({ cockpitLine }),
  setNarratorLine: (narratorLine) => set({ narratorLine }),
  trigger: (eventType, params = {}) => {
    const lines = montyDialog[eventType];
    if (!lines) return;
    const line = substitute(pickRandom(lines), params);
    const state = stateForEvent[eventType] ?? 'idle';
    const isNarrator = eventType.startsWith('narrator_');
    if (isNarrator) {
      set({ narratorLine: line });
    } else {
      set({ cockpitState: state, cockpitLine: line });
    }
  },
  clearLine: () => set({ cockpitLine: null }),
}));
