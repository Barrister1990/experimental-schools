'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  showLogo?: boolean;
  delay?: number; // Delay before showing overlay (prevents flash on fast loads)
}

export default function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  showLogo = true,
  delay = 100,
}: LoadingOverlayProps) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (isLoading) {
      // Small delay to prevent flash on fast loads
      const timer = setTimeout(() => {
        setShow(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      // Fade out before hiding
      setShow(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isLoading, delay]);

  if (!mounted && !isLoading) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        show ? 'opacity-100' : 'opacity-0'
      } ${isLoading ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(59, 130, 246, 0.9) 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-300 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 px-4">
        {/* Logo with Animation */}
        {showLogo && (
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-white rounded-full blur-2xl opacity-30 animate-pulse-glow"></div>
            </div>
            
            {/* Logo Container with Scale Animation */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 animate-scale-bounce">
              <Image
                src="/logo.png"
                alt="Hohoe Experimental Schools Logo"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
            
            {/* Rotating Ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 border-4 border-white/30 border-t-white rounded-full animate-spin-slow"></div>
            </div>
          </div>
        )}

        {/* School Name with Fade Animation */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
            HOHOE EXPERIMENTAL SCHOOLS
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-blue-100 font-medium">
            School Management System
          </p>
        </div>

        {/* Loading Spinner */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {/* Outer Ring */}
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            {/* Inner Dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {/* Loading Text */}
          <p className="text-white/90 text-sm sm:text-base font-medium animate-pulse-slow">
            {message}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce-loader" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce-loader" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce-loader" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

