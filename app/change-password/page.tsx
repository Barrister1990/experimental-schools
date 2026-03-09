'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { passwordService } from '@/lib/services/password-service';
import Image from 'next/image';

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
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

const firstTimePasswordSchema = z
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

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
type FirstTimePasswordFormData = z.infer<typeof firstTimePasswordSchema>;

function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams.get('email') || '';
  const isFirstTime = searchParams.get('firstTime') === 'true';
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const regularForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const firstTimeForm = useForm<FirstTimePasswordFormData>({
    resolver: zodResolver(firstTimePasswordSchema),
  });

  const form = isFirstTime ? firstTimeForm : regularForm;
  const newPassword = isFirstTime 
    ? (firstTimeForm.watch('newPassword') as string | undefined)
    : (regularForm.watch('newPassword') as string | undefined);

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

  const onSubmit = async (data: PasswordChangeFormData | FirstTimePasswordFormData): Promise<void> => {
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await passwordService.changePassword(
        email,
        {
          currentPassword: isFirstTime ? '' : (data as PasswordChangeFormData).currentPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        },
        isFirstTime
      );

      setSuccess(true);
      setTimeout(() => {
        router.push('/?passwordChanged=true');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password change failed';
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
              Password {isFirstTime ? 'Set' : 'Changed'} Successfully!
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              Your password has been {isFirstTime ? 'set' : 'changed'} successfully. Redirecting to login...
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
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                {isFirstTime ? 'Set Your Password' : 'Change Password'}
              </h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                {isFirstTime
                  ? 'Please set a new password for your account'
                  : 'Enter your current password and choose a new one'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={isFirstTime ? firstTimeForm.handleSubmit(onSubmit) : regularForm.handleSubmit(onSubmit)} className="space-y-4">
            {!isFirstTime && (
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    {...(isFirstTime ? {} : regularForm.register('currentPassword'))}
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {!isFirstTime && regularForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {regularForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  {...(isFirstTime ? firstTimeForm.register('newPassword') : regularForm.register('newPassword'))}
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {form.formState.errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.newPassword.message}
                </p>
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
                  {...(isFirstTime ? firstTimeForm.register('confirmPassword') : regularForm.register('confirmPassword'))}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
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
              {form.formState.errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm md:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : isFirstTime ? 'Set Password' : 'Change Password'}
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

export default function ChangePasswordPage() {
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
      <ChangePasswordContent />
    </Suspense>
  );
}

