'use client';

import { authService } from '@/lib/services/auth-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

/**
 * Client-side auth callback handler
 * Handles hash-based auth tokens (from inviteUserByEmail)
 * Since hash fragments aren't sent to server, we handle them here
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for hash tokens (from invite flow)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && refreshToken && type === 'invite') {
            // Set the session from hash tokens
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              throw sessionError;
            }

            if (!session) {
              throw new Error('Failed to create session');
            }

            // Get the authenticated user
            const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !authUser) {
              throw userError || new Error('No user found');
            }

            // Update email_verified in our database
            await supabase
              .from('users')
              .update({ email_verified: true })
              .eq('auth_user_id', authUser.id);

            // Get user profile
            const userProfile = await authService.getCurrentUser();
            
            if (!userProfile) {
              throw new Error('Failed to get user profile');
            }

            setUser(userProfile);
            
            // Check if password change is required
            const { data: userData } = await supabase
              .from('users')
              .select('password_change_required, email_verified, role')
              .eq('auth_user_id', authUser.id)
              .single();

            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);

            setStatus('success');

            // Redirect based on user status
            if (userData?.password_change_required) {
              setTimeout(() => {
                router.push(`/change-password?email=${encodeURIComponent(authUser.email || '')}&firstTime=true`);
              }, 500);
            } else if (userData?.role === 'admin') {
              setTimeout(() => {
                router.push('/admin/dashboard');
              }, 500);
            } else {
              setTimeout(() => {
                router.push('/teacher/dashboard');
              }, 500);
            }
          } else {
            throw new Error('Invalid auth callback parameters');
          }
        } else {
          // No hash tokens found
          throw new Error('No auth tokens found in URL');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
        
        // Redirect to login after error
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router, setUser, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative w-16 h-16">
            <Image
              src="/logo.png"
              alt="Hohoe Experimental Schools Logo"
              fill
              className="object-contain"
            />
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">HOHOE EXPERIMENTAL SCHOOLS</h1>
        
        {status === 'processing' && (
          <div className="mt-8">
            <div className="mx-auto w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Completing authentication...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-8">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-gray-600">Authentication successful! Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-8">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-red-600">{error}</p>
            <p className="mt-2 text-xs text-gray-500">Redirecting to login...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative w-16 h-16">
              <Image
                src="/logo.png"
                alt="Hohoe Experimental Schools Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">HOHOE EXPERIMENTAL SCHOOLS</h1>
          <div className="mt-8">
            <div className="mx-auto w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

