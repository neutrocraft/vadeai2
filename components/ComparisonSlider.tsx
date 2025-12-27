import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ beforeImage, afterImage }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(50); // Default 50%
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    // Calculate percentage
    const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(newPos);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    handleMove(e.clientX);
  }, [isResizing, handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing) return;
    handleMove(e.touches[0].clientX);
  }, [isResizing, handleMove]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleTouchMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900 rounded-lg"
    >
      {/* 
         LAYER 1: The "After" Image (Background) 
         Full width, always visible behind the clip.
      */}
      <img 
        src={afterImage} 
        alt="After" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" 
        draggable={false}
      />
      
      {/* Label: After */}
      <div className="absolute bottom-4 right-4 bg-indigo-600/90 backdrop-blur-md text-white px-3 py-1 text-xs font-bold rounded shadow-lg pointer-events-none z-10">
        PROCESSED
      </div>

      {/* 
         LAYER 2: The "Before" Image (Foreground) 
         We use `clip-path` instead of `width`. 
         This ensures the image geometry is calculated correctly immediately on mount, 
         solving the "invisible image" bug.
      */}
      <img 
        src={beforeImage} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-20"
        style={{ 
          clipPath: `inset(0 ${100 - position}% 0 0)` // Clips from the right side
        }}
        draggable={false}
      />
      
      {/* Label: Before (Also clipped so it disappears as slider moves) */}
      <div 
        className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 text-xs font-bold rounded shadow-lg pointer-events-none z-30"
        style={{ 
            opacity: position < 10 ? 0 : 1,
            transition: 'opacity 0.2s'
        }}
      >
        ORIGINAL
      </div>

      {/* 
         LAYER 3: The Slider Handle 
         Positioned absolutely based on percentage.
      */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-40 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        style={{ left: `${position}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xl text-indigo-900 border-2 border-slate-200 hover:scale-110 transition-transform">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 12h-8" />
            <path d="M12 16l-4-4 4-4" />
            <path d="M20 12l-4 4" />
            <path d="M20 12l-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
};