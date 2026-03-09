'use client';

import LoginForm from '@/components/auth/LoginForm';
import { useAuthStore } from '@/lib/stores/auth-store';
import { CheckCircle, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Note: Redirect after login is handled by LoginForm component
  // This useEffect is removed to avoid double redirects and delays

  useEffect(() => {
    // Check for success query parameters
    const passwordChanged = searchParams.get('passwordChanged');
    const passwordReset = searchParams.get('passwordReset');
    const emailVerified = searchParams.get('emailVerified');

    if (passwordChanged === 'true') {
      setSuccessMessage('Password changed successfully! You can now log in with your new password.');
      // Clear the query parameter
      router.replace('/', { scroll: false });
    } else if (passwordReset === 'true') {
      setSuccessMessage('Password reset successfully! You can now log in with your new password.');
      router.replace('/', { scroll: false });
    } else if (emailVerified === 'true') {
      setSuccessMessage('Email verified successfully! You can now log in.');
      router.replace('/', { scroll: false });
    }

    // Auto-dismiss success message after 5 seconds
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router, successMessage]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left side - Illustration (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 items-center justify-center p-8">
        <div className="max-w-md w-full">
          {/* Illustration */}
          <div className="mb-6">
            <svg
              viewBox="0 0 400 300"
              className="w-full h-auto max-h-64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* School building */}
              <rect x="50" y="100" width="300" height="180" fill="#3B82F6" opacity="0.2" rx="8" />
              <rect x="70" y="120" width="60" height="80" fill="#2563EB" opacity="0.3" rx="4" />
              <rect x="150" y="120" width="60" height="80" fill="#2563EB" opacity="0.3" rx="4" />
              <rect x="270" y="120" width="60" height="80" fill="#2563EB" opacity="0.3" rx="4" />
              
              {/* Roof */}
              <path d="M30 100 L200 40 L370 100" fill="#1E40AF" opacity="0.3" />
              
              {/* Door */}
              <rect x="175" y="200" width="50" height="80" fill="#1E40AF" opacity="0.4" rx="4" />
              
              {/* Students */}
              <circle cx="100" cy="250" r="15" fill="#10B981" />
              <circle cx="200" cy="250" r="15" fill="#10B981" />
              <circle cx="300" cy="250" r="15" fill="#10B981" />
              
              {/* Books/Education icons */}
              <rect x="80" y="50" width="20" height="15" fill="#F59E0B" opacity="0.6" rx="2" />
              <rect x="300" y="50" width="20" height="15" fill="#F59E0B" opacity="0.6" rx="2" />
              
              {/* Decorative elements */}
              <circle cx="350" cy="60" r="8" fill="#3B82F6" opacity="0.4" />
              <circle cx="50" cy="60" r="8" fill="#3B82F6" opacity="0.4" />
            </svg>
          </div>
          
          {/* Welcome text */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome Back!
            </h2>
            <p className="text-sm text-gray-600">
              Access your school management system to manage classes, students, and grades all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {/* Logo and School Name */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            <Image
                  src="/logo.png"
                  alt="Hohoe Experimental Schools Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              HOHOE EXPERIMENTAL SCHOOLS
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              School Management System
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="ml-3 flex-shrink-0 text-green-500 hover:text-green-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Login Form */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Secure access for authorized personnel only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-white overflow-y-auto">
          <div className="w-full max-w-md my-auto text-center">
            <div className="flex justify-center mb-3">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <Image
                  src="/logo.png"
                  alt="Hohoe Experimental Schools Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              HOHOE EXPERIMENTAL SCHOOLS
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              School Management System
            </p>
            <div className="mx-auto w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
