/**
 * Source Trace Overlay - Renders deck.gl trace layers over the map
 * This component provides an overlay for source tracing visualization
 */

import React, { useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import styled from 'styled-components';
import { useTraceContext } from '../context/trace-context';
import { useTraceAnimation } from '../hooks/use-trace-animation';
import { useSourceTraceLayers, getTraceViewport } from '../layers/source-trace-layer';

const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;

  /* Keep the map interactive; only controls should capture input */
  & canvas {
    pointer-events: none;
  }
`;

const AnimationControls = styled.div`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26, 26, 46, 0.9);
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PlayButton = styled.button`
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.9;
  }
`;

const TimelineSlider = styled.input`
  width: 160px;
  accent-color: #2196F3;
`;

const ProgressLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  min-width: 60px;
`;

const CloseButton = styled.button`
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: none;
  font-size: 14px;
  cursor: pointer;
  margin-left: 8px;

  &:hover {
    color: white;
  }
`;

const TraceLegend = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(26, 26, 46, 0.9);
  border-radius: 8px;
  padding: 8px 16px;
  pointer-events: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const LegendTitle = styled.div`
  color: white;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
`;

const LegendItems = styled.div`
  display: flex;
  gap: 16px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
`;

const LegendDot = styled.div<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.color};
`;

interface SourceTraceOverlayProps {
  viewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  onViewStateChange?: (viewState: { viewState: any }) => void;
}

export const SourceTraceOverlay: React.FC<SourceTraceOverlayProps> = ({
  viewState,
  onViewStateChange,
}) => {
  const { trace, selectedFactory, isTraceActive, clearTrace } = useTraceContext();
  const viewStateChangedRef = useRef(false);

  // Animation hook
  const {
    animationTime,
    isAnimating,
    toggle,
    progress,
    setTime,
  } = useTraceAnimation(trace, {
    speed: 1,
    loop: true,
    duration: 6000,
    autoStart: true,
  });

  // Generate deck.gl layers
  const layers = useSourceTraceLayers({
    trace,
    animationTime,
    isAnimating,
    selectedFactory,
  });

  // Auto-fit viewport to trace path (only once when trace changes)
  useEffect(() => {
    if (trace && onViewStateChange && !viewStateChangedRef.current) {
      const traceViewport = getTraceViewport(trace);
      if (traceViewport) {
        onViewStateChange({
          viewState: {
            ...viewState,
            longitude: traceViewport.longitude,
            latitude: traceViewport.latitude,
            zoom: 10,
            transitionDuration: 1000,
          },
        });
        viewStateChangedRef.current = true;
      }
    }
  }, [trace, onViewStateChange, viewState]);

  // Reset the ref when trace changes
  useEffect(() => {
    viewStateChangedRef.current = false;
  }, [trace?.source_station]);

  if (!isTraceActive || !trace) {
    return null;
  }

  return (
    <OverlayContainer>
      <DeckGL
        viewState={viewState}
        layers={layers}
        controller={false}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Legend */}
      <TraceLegend>
        <LegendTitle>Source Tracing: {trace.source_station}</LegendTitle>
        <LegendItems>
          <LegendItem>
            <LegendDot color="#4CAF50" />
            Detection
          </LegendItem>
          <LegendItem>
            <LegendDot color="#2196F3" />
            Trace Path
          </LegendItem>
          <LegendItem>
            <LegendDot color="#F44336" />
            Source
          </LegendItem>
          <LegendItem>
            <LegendDot color="#FF9800" />
            Factory
          </LegendItem>
        </LegendItems>
      </TraceLegend>

      {/* Animation Controls */}
      <AnimationControls>
        <PlayButton onClick={toggle}>
          {isAnimating ? '⏸' : '▶'}
        </PlayButton>
        <TimelineSlider
          type="range"
          min={0}
          max={100}
          step={1}
          value={progress}
          onChange={event => setTime(Number(event.target.value))}
        />
        <ProgressLabel>
          {trace.total_distance_km.toFixed(1)} km traced
        </ProgressLabel>
        <CloseButton onClick={clearTrace} title="Close trace">
          ✕
        </CloseButton>
      </AnimationControls>
    </OverlayContainer>
  );
};

export default SourceTraceOverlay;
