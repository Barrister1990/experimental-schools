'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import LoadingOverlay from './LoadingOverlay';

/**
 * Global loading overlay that shows during authentication initialization
 * This component monitors the global auth loading state and displays
 * a beautiful animated overlay when the app is checking authentication
 */
export default function GlobalLoadingOverlay() {
  const { isLoading } = useAuthStore();

  return <LoadingOverlay isLoading={isLoading} message="Initializing..." />;
}

