"use client";


interface TikTokLoaderProps {
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "dots" | "pulse";
  text?: string;
  fullScreen?: boolean;
  inline?: boolean;
  className?: string;
}

export default function TikTokLoader({ 
  size = "md", 
  variant = "spinner",
  text,
  fullScreen = false,
  inline = false,
  className = "" 
}: TikTokLoaderProps) {
  // Size configurations
  const sizeConfig = {
    sm: {
      spinner: "w-5 h-5 border-2",
      dot: "w-1.5 h-1.5",
      text: "text-xs",
      gap: "gap-2",
    },
    md: {
      spinner: "w-8 h-8 border-4",
      dot: "w-2 h-2",
      text: "text-sm",
      gap: "gap-3",
    },
    lg: {
      spinner: "w-12 h-12 border-4",
      dot: "w-2.5 h-2.5",
      text: "text-base",
      gap: "gap-4",
    },
  };

  const config = sizeConfig[size];

  // Spinner variant - clean circular spinner
  const SpinnerLoader = () => (
    <div 
      className={`${config.spinner} border-blue-200 border-t-blue-600 rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  // Dots variant - three bouncing dots
  const DotsLoader = () => (
    <div className={`flex ${config.gap} items-center`} role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`${config.dot} bg-blue-600 rounded-full animate-bounce`}
          style={{
            animationDelay: `${index * 0.16}s`,
            animationDuration: '1.4s',
          }}
        ></div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );

  // Pulse variant - pulsing circle
  const PulseLoader = () => (
    <div 
      className={`${config.spinner} bg-blue-600 rounded-full animate-pulse`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
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

  // Content wrapper
  const content = (
    <div className={`flex flex-col items-center justify-center ${config.gap}`}>
      {renderLoader()}
      {text && (
        <p className={`${config.text} text-gray-600 dark:text-gray-400 font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  // Full screen wrapper
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {content}
        </div>
      </div>
    );
  }

  // Inline wrapper (no padding, just the loader)
  if (inline) {
    return (
      <div className={`inline-flex items-center ${config.gap} ${className}`}>
        {renderLoader()}
        {text && (
          <span className={`${config.text} text-gray-600 dark:text-gray-400`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Default wrapper (centered with padding)
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      {content}
    </div>
  );
}
