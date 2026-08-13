// 
// authStore.ts
//
// Replaces the old Puter-based usePuterStore auth slice. Kept as a small
// zustand store with a similar shape (isLoading, error, auth.user,
// auth.isAuthenticated) so the pages that consumed the old store only need
// their import + a couple of field names updated, not a rewrite.
// 

import { create } from "zustand";
import { apiGet, apiSend, ApiError } from "./apiClient";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean; // true while the initial session check is in flight
  error: string | null;
  checkAuthStatus: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkAuthStatus: async () => {
    set({ isLoading: true });
    try {
      const { user } = await apiGet<{ user: AuthUser }>("/api/auth/me");
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch {
      // Not logged in yet - this is an expected state on first load, not an error.
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiSend<{ user: AuthUser }>("/api/auth/login", "POST", { email, password });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof ApiError ? err.message : "Login failed" });
      throw err;
    }
  },

  signup: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiSend<{ user: AuthUser }>("/api/auth/signup", "POST", { name, email, password });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof ApiError ? err.message : "Signup failed" });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiSend("/api/auth/logout", "POST");
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
