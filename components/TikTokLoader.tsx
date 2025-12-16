"use client";

import { useEffect, useState } from "react";

interface TikTokLoaderProps {
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "dots" | "pulse";
  text?: string;
  fullScreen?: boolean;
  inline?: boolean;
  className?: string;
  textClassName?: string;
}

export default function TikTokLoader({ 
  size = "md", 
  variant = "spinner",
  text,
  fullScreen = false,
  inline = false,
  className = "",
  textClassName = ""
}: TikTokLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Size configurations
  const sizeConfig = {
    sm: {
      spinner: "w-5 h-5 border-2",
      dot: "w-1.5 h-1.5",
      text: "text-xs",
      gap: "gap-2",
      pulse: "w-4 h-4",
    },
    md: {
      spinner: "w-8 h-8 border-4",
      dot: "w-2 h-2",
      text: "text-sm",
      gap: "gap-3",
      pulse: "w-6 h-6",
    },
    lg: {
      spinner: "w-12 h-12 border-4",
      dot: "w-2.5 h-2.5",
      text: "text-base",
      gap: "gap-4",
      pulse: "w-8 h-8",
    },
  };

  const config = sizeConfig[size];

  // Spinner variant - enhanced with gradient and glow
  const SpinnerLoader = () => (
    <div className="relative" role="status" aria-label="Loading">
      {/* Glow effect */}
      <div className={`absolute inset-0 ${config.spinner} border-blue-400/30 rounded-full blur-sm animate-pulse-slow`}></div>
      {/* Main spinner with gradient */}
      <div 
        className={`${config.spinner} border-blue-200 border-t-blue-600 rounded-full animate-spin relative z-10`}
        style={{
          background: 'conic-gradient(from 0deg, transparent, transparent, transparent, transparent)',
        }}
      >
        <span className="sr-only">Loading...</span>
      </div>
      {/* Inner glow dot */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
    </div>
  );

  // Dots variant - enhanced with scale and glow
  const DotsLoader = () => (
    <div className={`flex ${config.gap} items-center`} role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <div key={index} className="relative">
          {/* Glow effect */}
          <div 
            className={`absolute inset-0 ${config.dot} bg-blue-400 rounded-full blur-sm opacity-50 animate-pulse-slow`}
            style={{ animationDelay: `${index * 0.2}s` }}
          ></div>
          {/* Main dot */}
        <div 
            className={`${config.dot} bg-blue-600 rounded-full animate-bounce-loader relative z-10 shadow-lg`}
            style={{
              animationDelay: `${index * 0.2}s`,
            }}
          ></div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );

  // Pulse variant - enhanced with ripple effects
  const PulseLoader = () => (
    <div className="relative" role="status" aria-label="Loading">
      {/* Outer ripple */}
      <div 
        className={`absolute inset-0 ${config.pulse} bg-blue-400/30 rounded-full animate-ping`}
          style={{ animationDelay: '0s' }}
        ></div>
      {/* Middle ripple */}
      <div 
        className={`absolute inset-0 ${config.pulse} bg-blue-500/20 rounded-full animate-ping`}
          style={{ animationDelay: '0.3s' }}
        ></div>
      {/* Main pulse circle */}
        <div 
        className={`${config.pulse} bg-blue-600 rounded-full animate-pulse-strong relative z-10 shadow-lg`}
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );

  // Render the appropriate loader variant
  const renderLoader = () => {
    switch (variant) {
      case "dots":
        return <DotsLoader />;
      case "pulse":
        return <PulseLoader />;
      case "spinner":
      default:
        return <SpinnerLoader />;
    }
  };

  // Content wrapper with fade-in animation
  const content = (
    <div 
      className={`flex flex-col items-center justify-center ${config.gap} transition-all duration-500 ${
        mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div className="transition-transform duration-300 hover:scale-105">
        {renderLoader()}
      </div>
      {text && (
        <p 
          className={`${config.text} text-gray-600 dark:text-gray-400 font-medium transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          } ${textClassName}`}
          style={{ transitionDelay: '0.2s' }}
        >
          {text}
        </p>
      )}
    </div>
  );

  // Full screen wrapper with backdrop animation
  if (fullScreen) {
    return (
      <div 
        className={`fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-200 dark:border-gray-700 transition-all duration-500 ${
            mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {content}
        </div>
      </div>
    );
  }

  // Inline wrapper (no padding, just the loader) with fade-in
  if (inline) {
    return (
      <div 
        className={`inline-flex items-center ${config.gap} transition-all duration-300 ${
          mounted ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      >
        <div className="transition-transform duration-200">
          {renderLoader()}
        </div>
        {text && (
          <span 
            className={`${config.text} text-gray-600 dark:text-gray-400 transition-all duration-300 ${
              mounted ? 'opacity-100' : 'opacity-0'
            } ${textClassName}`}
            style={{ transitionDelay: '0.1s' }}
          >
            {text}
          </span>
        )}
      </div>
    );
  }

  // Default wrapper (centered with padding) with fade-in
  return (
    <div 
      className={`flex items-center justify-center py-8 transition-all duration-500 ${
        mounted ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {content}
    </div>
  );
}
