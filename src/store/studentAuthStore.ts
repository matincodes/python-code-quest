import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

export interface StudentUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  score: number;
}

interface StudentAuthState {
  user: StudentUser | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useStudentAuthStore = create<StudentAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const res = await api.studentAuth.login(credentials);
        set({ user: res.user, isAuthenticated: true });
      },

      register: async (data) => {
        await api.studentAuth.register(data);
      },

      logout: async () => {
        try {
          await api.studentAuth.logout();
        } catch (e) {
          console.error(e);
        }
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        try {
          const res = await api.studentAuth.me();
          set({ user: res.user, isAuthenticated: true });
        } catch (e) {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'student-auth-storage',
    }
  )
);
