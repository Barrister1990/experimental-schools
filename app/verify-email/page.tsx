'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Mail, AlertCircle } from 'lucide-react';
import { passwordService } from '@/lib/services/password-service';
import { supabase } from '@/lib/supabase/client';
import { authService } from '@/lib/services/auth-service';
import Image from 'next/image';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle Supabase auth callback (tokens in URL hash)
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if we have auth tokens in the hash (from Supabase redirect)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'invite') {
          setLoading(true);
          setVerificationStatus('verifying');
          setError(null);

          try {
            // The Supabase client should automatically handle the tokens
            // Get the authenticated user
            const { data: { user: authUser } } = await supabase.auth.getUser();
            
            if (authUser) {
              // Update email_verified in our database
              await supabase
                .from('users')
                .update({ email_verified: true })
                .eq('auth_user_id', authUser.id);

              // Clear the hash from URL
              window.history.replaceState(null, '', window.location.pathname + window.location.search);

              setVerificationStatus('success');
              
              // Check if password change is needed
              const { data: userData } = await supabase
                .from('users')
                .select('password_change_required')
                .eq('auth_user_id', authUser.id)
                .single();

              setTimeout(() => {
                if (userData?.password_change_required) {
                  router.push(`/change-password?email=${encodeURIComponent(authUser.email || '')}&firstTime=true`);
                } else {
                  router.push('/?emailVerified=true');
                }
              }, 2000);
            }
          } catch (err) {
            setVerificationStatus('error');
            setError(err instanceof Error ? err.message : 'Verification failed');
            setLoading(false);
          }
        }
      }
    };

    handleAuthCallback();
  }, [router]);

  const handleVerify = async () => {
    setLoading(true);
    setVerificationStatus('verifying');
    setError(null);

    try {
      // If token is provided, verify it
      if (token) {
        await passwordService.verifyEmail(token);
      } else {
        // If no token, check if user is already verified (Supabase auto-confirms on link click)
        // This handles the case where Supabase confirms the email automatically
        const isVerified = await passwordService.isEmailVerified(email);
        if (!isVerified) {
          throw new Error('Email verification token is missing or invalid');
        }
      }

      setVerificationStatus('success');
      
      // Check if password change is needed
      const needsPasswordChange = await passwordService.needsPasswordChange(email);
      
      setTimeout(() => {
        if (needsPasswordChange) {
          router.push(`/change-password?email=${encodeURIComponent(email)}&firstTime=true`);
        } else {
          router.push('/?emailVerified=true');
        }
      }, 2000);
    } catch (err) {
      setVerificationStatus('error');
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-verify if token is present OR if email is present (Supabase auto-confirms on link click)
    if ((token || email) && verificationStatus === 'idle') {
      handleVerify();
    }
  }, [token, email]);

  if (verificationStatus === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
              Email Verified!
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              Your email has been successfully verified. Redirecting...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and School Name */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16 md:w-20 md:h-20">
              <Image
                src="/logo.png"
                alt="Hohoe Experimental Schools Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-lg md:text-xl font-bold text-gray-900">HOHOE EXPERIMENTAL SCHOOLS</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">School Management System</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                Verify Your Email
              </h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                Confirm your email address to activate your account
              </p>
            </div>
          </div>

          {email && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Verification link sent to <strong>{email}</strong>
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-600 font-medium mb-1">Verification Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {token ? (
            <div className="text-center">
              {loading || verificationStatus === 'verifying' ? (
                <>
                  <div className="mb-4">
                    <div className="mx-auto w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Verifying your email address...
                  </p>
                </>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Click the button below to verify your email.
                  </p>
                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm md:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Please check your email and click the verification link to verify your account.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg text-sm md:text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Back to Login
                </button>
                <p className="text-xs text-center text-gray-500">
                  Didn't receive the email? Check your spam folder or contact your administrator.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16 md:w-20 md:h-20">
              <Image
                src="/logo.png"
                alt="Hohoe Experimental Schools Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-lg md:text-xl font-bold text-gray-900">HOHOE EXPERIMENTAL SCHOOLS</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-1">School Management System</p>
          <div className="mt-8">
            <div className="mx-auto w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

