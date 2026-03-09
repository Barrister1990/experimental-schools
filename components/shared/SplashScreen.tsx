'use client';

import { useEffect, useState } from 'react';
import LoadingOverlay from './LoadingOverlay';

const SPLASH_DURATION_MS = 1000;
const SPLASH_MAX_MS = 1500; // Never show longer than this (safety)

/**
 * Splash Screen Component
 * Shows a loading overlay for up to 1s on first visit. Always hides by SPLASH_MAX_MS
 * so the app never hangs on the splash after refresh or slow runtimes.
 */
export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const hide = () => setShow(false);

    let hasVisited = false;
    try {
      hasVisited = !!sessionStorage.getItem('app_visited');
    } catch {
      // sessionStorage unavailable (e.g. private mode)
    }

    if (hasVisited) {
      hide();
      return;
    }

    try {
      sessionStorage.setItem('app_visited', 'true');
    } catch {
      // ignore
    }

    const timer = setTimeout(hide, SPLASH_DURATION_MS);
    const safetyTimer = setTimeout(hide, SPLASH_MAX_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, []);

  if (!mounted || !show) {
    return null;
  }

  return (
    <LoadingOverlay
      isLoading={show}
      message="Welcome to Hohoe Experimental Schools"
      showLogo={true}
      delay={0}
    />
  );
}

