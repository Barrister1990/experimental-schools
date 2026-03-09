'use client';

import { passwordService } from '@/lib/services/password-service';
import { supabase } from '@/lib/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Support both 'code' (Supabase) and 'token' (legacy) parameters
  const code = searchParams.get('code') || '';
  const token = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const newPassword = watch('newPassword');

  // Handle Supabase password reset callback (tokens in URL hash or code parameter)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let checkTimeoutId: NodeJS.Timeout | null = null;
    let mounted = true;

    const handleAuthCallback = async () => {
      // Set a global timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (mounted && loading && !isAuthenticated) {
          setLoading(false);
          setError('Verification is taking too long. Please ensure you clicked the complete link from your email. If the problem persists, request a new password reset.');
        }
      }, 5000); // 5 second timeout
      // Check if we have auth tokens in the hash (from Supabase redirect)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'recovery') {
          setLoading(true);
          setError(null);

          try {
            const refreshToken = hashParams.get('refresh_token');
            
            if (!refreshToken) {
              throw new Error('Missing refresh token. Please request a new password reset.');
            }

            // Set the session from hash tokens
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError || !session) {
              throw new Error('Failed to authenticate. Please request a new password reset.');
            }

            // Verify we have a user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (user && !userError) {
              // Clear the hash from URL
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              setIsAuthenticated(true);
            } else {
              throw new Error('Failed to authenticate. Please request a new password reset.');
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to authenticate. Please request a new password reset.');
          } finally {
            setLoading(false);
          }
        }
      } else if (code) {
        // If we have a code parameter, verify it and establish a session
        setLoading(true);
        setError(null);
        
        try {
          // First, check if Supabase has already established a session automatically
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          
          if (existingSession) {
            // Session already exists
            if (timeoutId) clearTimeout(timeoutId);
            setIsAuthenticated(true);
            setLoading(false);
            return;
          }

          // When using {{ .ConfirmationURL }}, Supabase redirects with a 'code' parameter
          // This is the CORRECT format - we need to exchange the code for a session
          // Use exchangeCodeForSession to authenticate the user
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError || !exchangeData.session) {
            // Exchange failed - the code may be invalid or expired
            if (timeoutId) clearTimeout(timeoutId);
            const errorMsg = exchangeError?.message || 'Invalid or expired reset code';
            console.error('Password reset code exchange failed:', {
              code,
              error: exchangeError?.message,
            });
            setError(`Unable to verify reset code: ${errorMsg}. The code may be invalid or expired. Please request a new password reset.`);
            setLoading(false);
            return;
          }

          // Exchange succeeded - session is now established
          if (timeoutId) clearTimeout(timeoutId);
          setIsAuthenticated(true);
          setLoading(false);

          // If we get here, verification succeeded but no session was created
          // This shouldn't happen, but let's wait a moment and check again
          checkTimeoutId = setTimeout(async () => {
            if (!mounted) return;
            
            const { data: { session: delayedSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (delayedSession && !sessionError) {
              // Session was established
              if (timeoutId) clearTimeout(timeoutId);
              setIsAuthenticated(true);
              setLoading(false);
            } else {
              // No session after verification - this is unusual
              if (timeoutId) clearTimeout(timeoutId);
              setError('Code verified but session not established. Please try refreshing the page or request a new password reset.');
              setLoading(false);
            }
          }, 1000); // Wait 1 second for session to be established
        } catch (err) {
          if (timeoutId) clearTimeout(timeoutId);
          setError(err instanceof Error ? err.message : 'Failed to verify reset code. Please request a new password reset.');
          setLoading(false);
        }
      } else if (!token) {
        // Only show error if we don't have code or token
        setError('Invalid or missing reset token. Please request a new password reset.');
      }
    };

    handleAuthCallback();

    // Cleanup timeouts on unmount
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (checkTimeoutId) clearTimeout(checkTimeoutId);
    };
  }, [code, token, loading, isAuthenticated]);

  const getPasswordStrength = (password: string): { strength: string; color: string; percentage: number } => {
    if (!password) return { strength: '', color: '', percentage: 0 };
    
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 5;

    if (strength >= 80) return { strength: 'Strong', color: 'bg-green-500', percentage: 100 };
    if (strength >= 60) return { strength: 'Good', color: 'bg-blue-500', percentage: 75 };
    if (strength >= 40) return { strength: 'Fair', color: 'bg-yellow-500', percentage: 50 };
    return { strength: 'Weak', color: 'bg-red-500', percentage: 25 };
  };

  const passwordStrength = getPasswordStrength(newPassword || '');

  const onSubmit = async (data: ResetPasswordFormData) => {
    // Check if we have authentication (from Supabase hash or code)
    if (!isAuthenticated && !token && !code) {
      setError('Invalid or missing reset token. Please request a new password reset.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If we have a token (legacy), use the password service
      if (token) {
        await passwordService.resetPassword(token, data.newPassword);
      } else {
        // For Supabase flow, we can directly update the password
        // The session is already established from the hash/code
        const { error: updateError } = await supabase.auth.updateUser({
          password: data.newPassword,
        });

        if (updateError) {
          if (updateError.message?.includes('weak') || updateError.message?.includes('password')) {
            throw new Error('Password does not meet security requirements. Please choose a stronger password.');
          }
          throw new Error(updateError.message || 'Failed to reset password. Please try again.');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/?passwordReset=true');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
              Password Reset Successful!
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              Your password has been successfully reset. Redirecting to login...
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
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Reset Password</h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                Enter your new password below
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!isAuthenticated && !token && !code && !loading && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Invalid or missing reset token. Please check your email link or request a new password reset.
              </p>
            </div>
          )}

          {loading && !isAuthenticated && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Verifying reset link...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  {...register('newPassword')}
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password strength</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength.strength === 'Strong' ? 'text-green-600' :
                      passwordStrength.strength === 'Good' ? 'text-blue-600' :
                      passwordStrength.strength === 'Fair' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {passwordStrength.strength}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600 mb-1">Password must contain:</p>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-2 ${
                    newPassword && newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      newPassword && newPassword.length >= 8 ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 ${
                    newPassword && /[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      newPassword && /[A-Z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${
                    newPassword && /[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      newPassword && /[a-z]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${
                    newPassword && /[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      newPassword && /[0-9]/.test(newPassword) ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                    One number
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || (!isAuthenticated && !token && !code)}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm md:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}

