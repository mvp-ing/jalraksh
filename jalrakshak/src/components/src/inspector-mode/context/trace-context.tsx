/**
 * Trace Context - Shares source trace data between Inspector Panel and Map
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { SourceTraceResponse, FactorySuspect } from '../types/inspector.types';

interface TraceContextValue {
  /** Current trace data */
  trace: SourceTraceResponse | null;
  /** Selected factory */
  selectedFactory: FactorySuspect | null;
  /** Whether trace visualization is active */
  isTraceActive: boolean;
  /** Set the trace data (triggers map visualization) */
  setTrace: (trace: SourceTraceResponse | null) => void;
  /** Set selected factory */
  setSelectedFactory: (factory: FactorySuspect | null) => void;
  /** Clear trace and hide visualization */
  clearTrace: () => void;
  /** Animation state */
  animationTime: number;
  /** Set animation time */
  setAnimationTime: (time: number) => void;
  /** Whether animation is playing */
  isAnimating: boolean;
  /** Set animation state */
  setIsAnimating: (animating: boolean) => void;
}

const TraceContext = createContext<TraceContextValue | null>(null);

interface TraceProviderProps {
  children: ReactNode;
}

export function TraceProvider({ children }: TraceProviderProps) {
  const [trace, setTraceInternal] = useState<SourceTraceResponse | null>(null);
  const [selectedFactory, setSelectedFactory] = useState<FactorySuspect | null>(null);
  const [isTraceActive, setIsTraceActive] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const setTrace = useCallback((newTrace: SourceTraceResponse | null) => {
    setTraceInternal(newTrace);
    setIsTraceActive(!!newTrace);
    if (newTrace) {
      setAnimationTime(0);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, []);

  const clearTrace = useCallback(() => {
    setTraceInternal(null);
    setSelectedFactory(null);
    setIsTraceActive(false);
    setAnimationTime(0);
    setIsAnimating(false);
  }, []);

  const value: TraceContextValue = {
    trace,
    selectedFactory,
    isTraceActive,
    setTrace,
    setSelectedFactory,
    clearTrace,
    animationTime,
    setAnimationTime,
    isAnimating,
    setIsAnimating,
  };

  return (
    <TraceContext.Provider value={value}>
      {children}
    </TraceContext.Provider>
  );
}

export function useTraceContext(): TraceContextValue {
  const context = useContext(TraceContext);
  if (!context) {
    throw new Error('useTraceContext must be used within a TraceProvider');
  }
  return context;
}

export default TraceContext;
