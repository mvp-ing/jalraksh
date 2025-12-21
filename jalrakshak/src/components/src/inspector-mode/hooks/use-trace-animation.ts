/**
 * Trace Animation Hook
 * Manages animation state for source trace visualization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SourceTraceResponse } from '../types/inspector.types';

interface UseTraceAnimationOptions {
  /** Animation speed multiplier (default: 1) */
  speed?: number;
  /** Whether to loop the animation (default: true) */
  loop?: boolean;
  /** Total animation duration in milliseconds (default: 5000) */
  duration?: number;
  /** Auto-start animation when trace changes (default: true) */
  autoStart?: boolean;
}

interface UseTraceAnimationReturn {
  /** Current animation time (0-100) */
  animationTime: number;
  /** Whether animation is currently playing */
  isAnimating: boolean;
  /** Start the animation */
  start: () => void;
  /** Pause the animation */
  pause: () => void;
  /** Reset animation to beginning */
  reset: () => void;
  /** Toggle between play and pause */
  toggle: () => void;
  /** Set animation time directly (0-100) */
  setTime: (time: number) => void;
  /** Animation progress as percentage (0-100) */
  progress: number;
}

/**
 * Hook for managing trace path animation
 * Time flows from 0 to 100, representing the trace from detection point upstream
 */
export function useTraceAnimation(
  trace: SourceTraceResponse | null,
  options: UseTraceAnimationOptions = {}
): UseTraceAnimationReturn {
  const {
    speed = 1,
    loop = true,
    duration = 5000,
    autoStart = true,
  } = options;

  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Animation loop using requestAnimationFrame
  const animate = useCallback((timestamp: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const rawProgress = (elapsed / duration) * 100 * speed;

    let newTime: number;
    if (loop) {
      newTime = rawProgress % 100;
    } else {
      newTime = Math.min(rawProgress, 100);
      if (newTime >= 100) {
        setIsAnimating(false);
        pausedTimeRef.current = 100;
        return;
      }
    }

    setAnimationTime(newTime);

    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [duration, speed, loop, isAnimating]);

  // Start animation
  const start = useCallback(() => {
    if (!trace) return;

    setIsAnimating(true);
    startTimeRef.current = null;

    // If we were paused, adjust start time to continue from paused position
    if (pausedTimeRef.current > 0 && pausedTimeRef.current < 100) {
      const elapsedBefore = (pausedTimeRef.current / 100) * duration / speed;
      startTimeRef.current = performance.now() - elapsedBefore;
    }
  }, [trace, duration, speed]);

  // Pause animation
  const pause = useCallback(() => {
    setIsAnimating(false);
    pausedTimeRef.current = animationTime;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [animationTime]);

  // Reset animation
  const reset = useCallback(() => {
    setIsAnimating(false);
    setAnimationTime(0);
    pausedTimeRef.current = 0;
    startTimeRef.current = null;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isAnimating) {
      pause();
    } else {
      start();
    }
  }, [isAnimating, pause, start]);

  // Set animation time directly
  const setTime = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(100, time));
    setAnimationTime(clampedTime);
    pausedTimeRef.current = clampedTime;

    // Adjust start time if animating
    if (isAnimating && startTimeRef.current !== null) {
      const elapsedForTime = (clampedTime / 100) * duration / speed;
      startTimeRef.current = performance.now() - elapsedForTime;
    }
  }, [duration, speed, isAnimating]);

  // Effect to run animation loop
  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animate]);

  // Auto-start when trace changes
  useEffect(() => {
    if (trace && autoStart) {
      reset();
      // Small delay to allow components to update
      const timeoutId = setTimeout(() => {
        start();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else if (!trace) {
      reset();
    }
  }, [trace, autoStart]); // Intentionally not including reset/start to avoid loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    animationTime,
    isAnimating,
    start,
    pause,
    reset,
    toggle,
    setTime,
    progress: animationTime,
  };
}

export default useTraceAnimation;
