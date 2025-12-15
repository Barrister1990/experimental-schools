'use client';

import { authService, LoginCredentials, PasswordChangeRequest } from '@/lib/services/auth-service';
import { User } from '@/types';
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<User | null>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  changePassword: (email: string, request: PasswordChangeRequest) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true, // Start as true - will be set to false after session initialization
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          // Simple, direct login - no complex timeouts or race conditions
          const response = await authService.login(credentials);
          
          // Set state immediately
          set({
            user: response.user,
            token: response.session?.access_token || null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return response.user;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      logout: async () => {
        // Clear state immediately for instant UI feedback
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        
        // Perform logout in background (don't await - let it happen async)
        // This allows immediate redirect while cleanup happens in background
        authService.logout().catch((error) => {
          console.error('Background logout error (non-blocking):', error);
        });
      },

      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.verifyEmail(token);
          set({ isLoading: false, error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      changePassword: async (email: string, request: PasswordChangeRequest) => {
        set({ isLoading: true, error: null });
        try {
          await authService.changePassword(request);
          set({ isLoading: false, error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password change failed';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      requestPasswordReset: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.requestPasswordReset(email);
          set({ isLoading: false, error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.resetPassword(token, newPassword);
          set({ isLoading: false, error: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          token: null, // Token is managed by Supabase session
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    })
);

