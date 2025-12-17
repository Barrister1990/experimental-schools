'use client';

import { authService } from '@/lib/services/auth-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';

/**
 * Provider component to initialize and maintain Supabase auth session
 * Wraps the app to handle session persistence across page refreshes
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, user: currentUser } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    const timeoutIds: Set<NodeJS.Timeout> = new Set();

    // Helper function to create a timeout promise
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      let timeoutId: NodeJS.Timeout | null = null;
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
          }, timeoutMs);
          if (timeoutId) {
            timeoutIds.add(timeoutId);
          }
        }),
      ]).finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutIds.delete(timeoutId);
        }
      });
    };

    // Initialize session on mount with timeout protection
    const initSession = async () => {
      try {
        // Set loading to true at start (in case it was reset)
        setLoading(true);
        
        // Check for existing session with 10 second timeout
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await withTimeout(sessionPromise, 10000);

        if (session && mounted) {
          // Get user profile with 10 second timeout
          const userPromise = authService.getCurrentUser();
          const user = await withTimeout(userPromise, 10000);
          
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
        // Always set loading to false after initialization completes (or times out)
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // Helper to wrap getCurrentUser with timeout
    const getCurrentUserWithTimeout = async (timeoutMs: number = 10000): Promise<any> => {
      return Promise.race([
        authService.getCurrentUser(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getCurrentUser timeout')), timeoutMs);
        }),
      ]);
    };

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
          try {
            const user = await getCurrentUserWithTimeout(10000);
            if (user && mounted) {
              setUser(user);
            }
          } catch (error) {
            console.error('Error fetching user in SIGNED_IN event:', error);
            // Don't block - user might be set by login() already
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
            try {
              const user = await getCurrentUserWithTimeout(10000);
              if (user && mounted) {
                setUser(user);
              }
            } catch (error) {
              console.error('Error refreshing user data:', error);
              // Non-critical error - don't block UI
            }
          }
        }, 100);
      }
    });

    // Safety timeout: Force loading to false after 15 seconds maximum
    // This ensures the overlay never stays forever, even if something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization safety timeout: Forcing loading to false');
        setLoading(false);
      }
    }, 15000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      // Clear all timeout IDs
      timeoutIds.forEach(id => clearTimeout(id));
      timeoutIds.clear();
      clearTimeout(safetyTimeout);
    };
  }, [setUser, setLoading]);

  return <>{children}</>;
}

