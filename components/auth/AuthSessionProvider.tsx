'use client';

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

    const SESSION_TIMEOUT_MS = 5000;
    const FETCH_ME_TIMEOUT_MS = 6000;
    const SAFETY_TIMEOUT_MS = 8000;

    // Initialize session on mount with timeout protection so the app never hangs
    const initSession = async () => {
      try {
        setLoading(true);

        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await withTimeout(sessionPromise, SESSION_TIMEOUT_MS);

        if (session && mounted) {
          const user = await withTimeout(fetchMe(), FETCH_ME_TIMEOUT_MS);

          if (user && mounted) {
            setUser(user);
          } else if (mounted) {
            setUser(null);
          }
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const fetchMe = async (): Promise<ReturnType<typeof useAuthStore.getState>['user']> => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (!data?.user) return null;
      const u = data.user;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        phone: u.phone,
        isActive: u.isActive,
        isClassTeacher: u.isClassTeacher ?? false,
        isSubjectTeacher: u.isSubjectTeacher ?? false,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
      };
    };

    initSession();

    const getMeWithTimeout = async (timeoutMs: number = FETCH_ME_TIMEOUT_MS) =>
      withTimeout(fetchMe(), timeoutMs);

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session) {
        const storeState = useAuthStore.getState();
        if (!storeState.user) {
          try {
            const user = await getMeWithTimeout(FETCH_ME_TIMEOUT_MS);
            if (user && mounted) setUser(user);
          } catch (error) {
            console.error('Error fetching user in SIGNED_IN event:', error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setTimeout(async () => {
          if (mounted) {
            try {
              const user = await getMeWithTimeout(FETCH_ME_TIMEOUT_MS);
              if (user && mounted) setUser(user);
            } catch (error) {
              console.error('Error refreshing user data:', error);
            }
          }
        }, 100);
      }
    });

    // Safety: guarantee loading is cleared so the app never hangs on splash/init
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth init safety timeout: clearing loading state');
        setLoading(false);
      }
    }, SAFETY_TIMEOUT_MS);

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

