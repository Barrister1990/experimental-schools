'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authService } from '@/lib/services/auth-service';
import { supabase } from '@/lib/supabase/client';

/**
 * Provider component to initialize and maintain Supabase auth session
 * Wraps the app to handle session persistence across page refreshes
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, user: currentUser } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    // Initialize session on mount
    const initSession = async () => {
      try {
        // Set loading to true at start (in case it was reset)
        setLoading(true);
        
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session && mounted) {
          // Get user profile
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            setUser(user);
          } else if (mounted) {
            // No user found, clear state
            setUser(null);
          }
        } else if (mounted) {
          // No session, clear state
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        // Always set loading to false after initialization completes
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session) {
        // Only fetch user if not already set (login() already sets it)
        // This avoids duplicate API calls during login
        // Check current user from store state
        const storeState = useAuthStore.getState();
        if (!storeState.user) {
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            setUser(user);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Refresh user data when token is refreshed (background operation)
        // Defer to avoid blocking UI
        setTimeout(async () => {
          if (mounted) {
            const user = await authService.getCurrentUser();
            if (user && mounted) {
              setUser(user);
            }
          }
        }, 100);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);

  return <>{children}</>;
}

