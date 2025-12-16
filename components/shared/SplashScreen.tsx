'use client';

import { useEffect, useState } from 'react';
import LoadingOverlay from './LoadingOverlay';

/**
 * Splash Screen Component
 * Shows a beautiful animated loading overlay for 1 second on initial app load
 * Perfect for PWA installations to provide a polished first impression
 */
export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted
    setMounted(true);

    // Check if this is the first visit (not a navigation)
    const hasVisited = sessionStorage.getItem('app_visited');
    
    if (hasVisited) {
      // User has visited before, don't show splash
      setShow(false);
      return;
    }

    // Mark as visited
    sessionStorage.setItem('app_visited', 'true');

        // Show splash for exactly 1 second
        const splashDuration = 1000; // 1 second
    
    const timer = setTimeout(() => {
      setShow(false);
    }, splashDuration);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (!mounted || !show) {
    return null;
  }

  return (
    <LoadingOverlay 
      isLoading={show} 
      message="Welcome to Hohoe E.P Basic A"
      showLogo={true}
      delay={0}
    />
  );
}

