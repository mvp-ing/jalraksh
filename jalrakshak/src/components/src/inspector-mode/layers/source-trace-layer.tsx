/**
 * Source Trace Layer - deck.gl visualization for pollution source tracing
 * Animates the trace path from detection point upstream to pollution sources
 */

import React, { useMemo } from 'react';
import { TripsLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import type { SourceTraceResponse, FactorySuspect, TraceNode } from '../types/inspector.types';

interface SourceTraceLayerProps {
  trace: SourceTraceResponse | null;
  animationTime: number;
  isAnimating: boolean;
  selectedFactory: FactorySuspect | null;
}

// Color constants for different elements
const COLORS = {
  tracePath: [33, 150, 243, 200] as [number, number, number, number], // Blue
  tracePathGlow: [33, 150, 243, 80] as [number, number, number, number],
  stationNormal: [255, 255, 255, 200] as [number, number, number, number],
  stationSource: [244, 67, 54, 255] as [number, number, number, number], // Red for source
  stationDetection: [76, 175, 80, 255] as [number, number, number, number], // Green for detection
  factoryLow: [255, 193, 7, 200] as [number, number, number, number], // Yellow
  factoryMedium: [255, 152, 0, 200] as [number, number, number, number], // Orange
  factoryHigh: [244, 67, 54, 200] as [number, number, number, number], // Red
  factorySelected: [156, 39, 176, 255] as [number, number, number, number], // Purple
};

/**
 * Get color based on suspicion score
 */
function getFactoryColor(score: number, isSelected: boolean): [number, number, number, number] {
  if (isSelected) return COLORS.factorySelected;
  if (score >= 0.7) return COLORS.factoryHigh;
  if (score >= 0.4) return COLORS.factoryMedium;
  return COLORS.factoryLow;
}

/**
 * Get radius based on suspicion score
 */
function getFactoryRadius(score: number, isSelected: boolean): number {
  const baseRadius = isSelected ? 16 : 10;
  return baseRadius + score * 12;
}

/**
 * Get station color based on position in trace
 */
function getStationColor(node: TraceNode, isFirst: boolean, isLast: boolean): [number, number, number, number] {
  if (isFirst) return COLORS.stationDetection; // Detection point (green)
  if (isLast) return COLORS.stationSource; // Source area (red)
  return COLORS.stationNormal;
}

/**
 * Format trace path for TripsLayer
 * Converts path segments into trip format with timestamps for animation
 */
function formatTripsData(trace: SourceTraceResponse): {
  path: [number, number, number][];
}[] {
  if (!trace.path_geometry || trace.path_geometry.length < 2) {
    return [];
  }

  // Each point has [lon, lat, timestamp]
  const totalDuration = 100; // Animation duration in arbitrary units
  const points: [number, number, number][] = trace.path_geometry.map((coord, index) => {
    const timestamp = (index / (trace.path_geometry.length - 1)) * totalDuration;
    // coord is [lon, lat]
    return [coord[0], coord[1], timestamp];
  });

  return [{ path: points }];
}

/**
 * Generate deck.gl layers for source trace visualization
 */
export function useSourceTraceLayers({
  trace,
  animationTime,
  isAnimating,
  selectedFactory,
}: SourceTraceLayerProps) {
  const layers = useMemo(() => {
    if (!trace) return [];

    const result = [];

    // 1. Animated trace path using TripsLayer
    if (trace.path_geometry && trace.path_geometry.length > 0) {
      const tripsData = formatTripsData(trace);

      // Glow effect (wider, semi-transparent line)
      result.push(
        new TripsLayer({
          id: 'source-trace-glow',
          data: tripsData,
          getPath: (d: { path: [number, number, number][] }) => d.path,
          getTimestamps: (d: { path: [number, number, number][] }) => d.path.map(p => p[2]),
          getColor: COLORS.tracePathGlow,
          widthMinPixels: 12,
          capRounded: true,
          jointRounded: true,
          trailLength: 30,
          currentTime: animationTime,
          opacity: 0.4,
        })
      );

      // Main trace line
      result.push(
        new TripsLayer({
          id: 'source-trace-path',
          data: tripsData,
          getPath: (d: { path: [number, number, number][] }) => d.path,
          getTimestamps: (d: { path: [number, number, number][] }) => d.path.map(p => p[2]),
          getColor: COLORS.tracePath,
          widthMinPixels: 4,
          capRounded: true,
          jointRounded: true,
          trailLength: 20,
          currentTime: animationTime,
        })
      );
    }

    // 2. Static path segments (always visible, fainter)
    if (trace.path_segments && trace.path_segments.length > 0) {
      result.push(
        new PathLayer({
          id: 'source-trace-base-path',
          data: trace.path_segments,
          getPath: d => d.coordinates,
          getColor: [100, 149, 237, 120], // Light blue, semi-transparent
          getWidth: 3,
          widthUnits: 'pixels',
          widthMinPixels: 2,
          rounded: true,
          pickable: false,
        })
      );
    }

    // 3. Station markers along the path
    if (trace.path && trace.path.length > 0) {
      const stationData = trace.path.map((node, index) => ({
        ...node,
        position: [node.coordinates[1], node.coordinates[0]], // [lon, lat]
        isFirst: index === 0,
        isLast: index === trace.path.length - 1,
      }));

      result.push(
        new ScatterplotLayer({
          id: 'source-trace-stations',
          data: stationData,
          getPosition: d => d.position,
          getRadius: d => (d.isFirst || d.isLast ? 12 : 8),
          radiusUnits: 'pixels',
          radiusMinPixels: 6,
          radiusMaxPixels: 20,
          getFillColor: d => getStationColor(d, d.isFirst, d.isLast),
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 2,
          stroked: true,
          pickable: false,
        })
      );
    }

    // 4. Factory markers with suspicion-based styling
    if (trace.factory_markers && trace.factory_markers.length > 0) {
      const factoryData = trace.factory_markers.map(factory => ({
        ...factory,
        position: factory.coordinates, // Already [lon, lat]
        isSelected: selectedFactory?.license_id === factory.id,
      }));

      // Factory pulsing ring (for high suspicion)
      const highSuspicionFactories = factoryData.filter(f => f.suspicion_score >= 0.7);
      if (highSuspicionFactories.length > 0 && isAnimating) {
        const pulseRadius = 25 + Math.sin(animationTime * 0.1) * 10;
        result.push(
          new ScatterplotLayer({
            id: 'source-trace-factory-pulse',
            data: highSuspicionFactories,
            getPosition: d => d.position,
            getRadius: pulseRadius,
            radiusUnits: 'pixels',
            getFillColor: [244, 67, 54, 50],
            getLineColor: [244, 67, 54, 150],
            lineWidthMinPixels: 2,
            stroked: true,
            pickable: false,
          })
        );
      }

      // Factory markers
      result.push(
        new ScatterplotLayer({
          id: 'source-trace-factories',
          data: factoryData,
          getPosition: d => d.position,
          getRadius: d => getFactoryRadius(d.suspicion_score, d.isSelected),
          radiusUnits: 'pixels',
          radiusMinPixels: 6,
          radiusMaxPixels: 28,
          getFillColor: d => getFactoryColor(d.suspicion_score, d.isSelected),
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: d => (d.isSelected ? 3 : 1),
          stroked: true,
          pickable: false,
        })
      );
    }

    return result;
  }, [trace, animationTime, isAnimating, selectedFactory]);

  return layers;
}

/**
 * Get the viewport to fit the trace path
 */
export function getTraceViewport(trace: SourceTraceResponse | null) {
  if (!trace || !trace.path_geometry || trace.path_geometry.length === 0) {
    return null;
  }

  const lons = trace.path_geometry.map(p => p[0]);
  const lats = trace.path_geometry.map(p => p[1]);

  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // Add padding
  const padding = 0.1;
  const lonPadding = (maxLon - minLon) * padding || 0.05;
  const latPadding = (maxLat - minLat) * padding || 0.05;

  return {
    longitude: (minLon + maxLon) / 2,
    latitude: (minLat + maxLat) / 2,
    zoom: 10, // Will be adjusted by fitBounds
    bounds: [
      [minLon - lonPadding, minLat - latPadding],
      [maxLon + lonPadding, maxLat + latPadding],
    ],
  };
}

export default useSourceTraceLayers;
