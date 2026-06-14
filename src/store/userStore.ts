import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'student' | 'admin' | 'audience';

export interface UserState {
  role: UserRole;
  alias: string;
  pin: string;
  editorMode: 'blocks' | 'code';
  isBeginner: boolean;
  avatarColor: string;
  piecesUnlocked: number;
  isAuthenticated: boolean;
  studentId: string | null;
  codeBroadcastEnabled: boolean;
  setRole: (role: UserRole) => void;
  setAlias: (alias: string) => void;
  setPin: (pin: string) => void;
  setMode: (mode: 'blocks' | 'code') => void;
  setIsBeginner: (isBeginner: boolean) => void;
  setAvatarColor: (color: string) => void;
  unlockPiece: () => void;
  setAuthenticated: (isAuth: boolean) => void;
  setStudentId: (id: string | null) => void;
  setCodeBroadcastEnabled: (val: boolean) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      role: 'student',
      alias: '',
      pin: '',
      editorMode: 'code',
      isBeginner: false,
      avatarColor: '#B58542',
      piecesUnlocked: 0,
      isAuthenticated: false,
      studentId: null,
      codeBroadcastEnabled: true,
      setRole: (role) => set({ role }),
      setAlias: (alias) => set({ alias }),
      setPin: (pin) => set({ pin }),
      setMode: (editorMode) => set({ editorMode }),
      setIsBeginner: (isBeginner) => set({ isBeginner, editorMode: isBeginner ? 'blocks' : 'code' }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      unlockPiece: () => set((state) => ({ piecesUnlocked: state.piecesUnlocked + 1 })),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setStudentId: (studentId) => set({ studentId }),
      setCodeBroadcastEnabled: (codeBroadcastEnabled) => set({ codeBroadcastEnabled }),
      reset: () => set({ 
        role: 'student', 
        alias: '', 
        pin: '',
        editorMode: 'code',
        isBeginner: false, 
        piecesUnlocked: 0,
        isAuthenticated: false,
        studentId: null,
        codeBroadcastEnabled: true
      }),
    }),
    {
      name: 'pcq-user-storage',
    }
  )
);

