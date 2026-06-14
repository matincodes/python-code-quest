import { useMontyStore } from '../store/montyStore';
import { montyDialog } from '../data/montyDialog';
import type { MontyState } from '../store/montyStore';

const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const substitute = (template: string, params: Record<string, string> = {}) =>
  template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);

export function useMonty() {
  const { setCockpitState, setCockpitLine, setNarratorLine } = useMontyStore();

  const trigger = (eventType: string, params?: Record<string, string>) => {
    const lines = montyDialog[eventType];
    if (!lines) return;
    const line = substitute(pickRandom(lines), params ?? {});

    const stateMap: Record<string, MontyState> = {
      onboarding: 'idle',
      challenge_start: 'happy',
      hint: 'hint',
      stuck_90s: 'thinking',
      success: 'celebrating',
      fail: 'sad',
      lobby: 'idle',
    };

    if (eventType.startsWith('narrator_')) {
      setNarratorLine(line);
    } else {
      setCockpitState(stateMap[eventType] ?? 'idle');
      setCockpitLine(line);
    }
  };

  const speak = (customText: string, state: MontyState = 'happy') => {
    setCockpitState(state);
    setCockpitLine(customText);
  };

  return { trigger, speak };
}
