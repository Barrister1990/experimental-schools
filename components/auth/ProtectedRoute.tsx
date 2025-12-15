'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { UserRole } from '@/types';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  useEffect(() => {
    // Don't check access until loading is complete AND user is fully loaded
    if (!isLoading && user) {
      if (!isAuthenticated) {
        // Use window.location for reliable redirect that bypasses router cache
        window.location.href = redirectTo;
        return;
      }

      // Check role-based access using the same logic as the render check
      // Only check if allowedRoles is defined and user object is complete
      if (allowedRoles && allowedRoles.length > 0) {
        const hasAccess = allowedRoles.some((role) => {
          if (role === 'admin') {
            return user.role === 'admin';
          }
          // For teacher roles, check the boolean flags
          // Only return true if flag is explicitly true (not undefined/null)
          if (role === 'class_teacher') {
            return user.isClassTeacher === true;
          }
          if (role === 'subject_teacher') {
            return user.isSubjectTeacher === true;
          }
          return false;
        });

        if (!hasAccess) {
          // Redirect to appropriate dashboard based on role
          // Use window.location for reliable redirect
          if (user.role === 'admin') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/teacher/dashboard';
          }
          return;
        }
      }
    }
  }, [isAuthenticated, user, isLoading, allowedRoles, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role access - ensure user data is complete before checking
  if (allowedRoles && user) {
    const hasAccess = allowedRoles.some((role) => {
      if (role === 'admin') {
        return user.role === 'admin';
      }
      // For teacher roles, check the boolean flags
      // Ensure flags are defined (not undefined/null) before checking
      if (role === 'class_teacher') {
        return user.isClassTeacher === true;
      }
      if (role === 'subject_teacher') {
        return user.isSubjectTeacher === true;
      }
      return false;
    });

    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
}

