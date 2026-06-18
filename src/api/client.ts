/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      ...options.headers,
    },
    credentials: "include", // essential for cookies
  });

  let data;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { error: text || "An error occurred" };
  }

  if (response.status === 401) {
    // Only attempt to refresh if this isn't already a refresh or login request
    if (!endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (refreshRes.ok) {
          // Retry the original request
          const retryRes = await fetch(url, {
            ...options,
            headers: { "Content-Type": "application/json", ...options.headers },
            credentials: "include",
          });
          
          let retryData;
          const retryText = await retryRes.text();
          try { retryData = JSON.parse(retryText); } 
          catch (e) { retryData = { error: retryText || "An error occurred" }; }
          
          if (!retryRes.ok) {
            throw new Error(retryData.error?.message || retryData.error || "An error occurred");
          }
          return retryData.data !== undefined ? retryData.data : retryData;
        }
      } catch (e) {
        // Refresh failed, fall through to logout
      }
    }

    // If it was a login request, DO NOT redirect or clear state. Just throw the original error.
    if (endpoint.includes('login')) {
      throw new Error(data.error?.message || data.error || "Invalid credentials");
    }

    // If we're here, refresh failed or this WAS a refresh request
    const { useUserStore } = await import('../store/userStore');
    const { useStudentAuthStore } = await import('../store/studentAuthStore');
    
    useUserStore.getState().reset();
    useStudentAuthStore.getState().logout();
    
    // Redirect based on current path to prevent infinite loops
    if (window.location.pathname.startsWith('/student')) {
      if (window.location.pathname !== '/student/login') {
        window.location.href = '/student/login';
      }
    } else {
      if (window.location.pathname !== '/admin') {
        window.location.href = '/admin';
      }
    }
    
    // Return a dummy error so the UI handles it smoothly without generic alerts
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || "An error occurred");
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  auth: {
    login: (credentials: any) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
    refresh: () => request("/auth/refresh", { method: "POST" }),
  },
  sessions: {
    create: (data: any) => request("/sessions", { method: "POST", body: JSON.stringify(data) }),
    getAll: () => request("/sessions"),
    getByPin: (pin: string) => request(`/sessions/${pin}`),
    updateStatus: (pin: string, status: string) => request(`/sessions/${pin}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    delete: (pin: string) => request(`/sessions/${pin}`, { method: "DELETE" }),
  },
  challenges: {
    getBySession: (pin: string) => request(`/sessions/${pin}/challenges`),
    create: (pin: string, data: any) => request(`/sessions/${pin}/challenges`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/challenges/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/challenges/${id}`, { method: "DELETE" }),
    reset: (pin: string) => request(`/sessions/${pin}/challenges/reset`, { method: "POST" }),
  },
  students: {
    getBySession: (pin: string) => request(`/sessions/${pin}/students`),
    getById: (id: string) => request(`/students/${id}`),
    updateScore: (id: string, points: number) => request(`/students/${id}/score`, { method: "PATCH", body: JSON.stringify({ points }) }),
    remove: (id: string) => request(`/students/${id}`, { method: "DELETE" }),
  },
  admin: {
    resetScores: (pin: string) => request(`/admin/${pin}/reset`, { method: "POST" }),
    startGame: (pin: string) => request(`/admin/${pin}/start`, { method: "POST" }),
    pushChallenge: (pin: string, challengeId: string) => request(`/admin/${pin}/push-challenge`, { method: "POST", body: JSON.stringify({ challengeId }) }),
    endGame: (pin: string) => request(`/admin/${pin}/end`, { method: "POST" }),
    broadcastHype: (pin: string, message: string) => request(`/admin/${pin}/monty-hype`, { method: "POST", body: JSON.stringify({ message }) }),
  },
  studentAuth: {
    register: (data: any) => request("/auth/student/register", { method: "POST", body: JSON.stringify(data) }),
    login: (credentials: any) => request("/auth/student/login", { method: "POST", body: JSON.stringify(credentials) }),
    logout: () => request("/auth/student/logout", { method: "POST" }),
    me: () => request("/auth/student/me"),
  },
  practiceChallenges: {
    getAll: () => request("/practice/challenges"),
    create: (data: any) => request("/practice/challenges", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/practice/challenges/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/practice/challenges/${id}`, { method: "DELETE" }),
  },
  practiceSessions: {
    getAll: () => request("/practice/sessions"), // admin
    start: () => request("/practice/sessions", { method: "POST" }),
    submit: (id: string, data: any) => request(`/practice/sessions/${id}/submit`, { method: "POST", body: JSON.stringify(data) }),
    end: (id: string) => request(`/practice/sessions/${id}/end`, { method: "POST" }),
    getHistory: () => request("/practice/sessions/history"),
  }
};
