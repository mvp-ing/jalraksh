// SPDX-License-Identifier: MIT
// Copyright Jalraksh

/**
 * Satellite Simulation Tool
 * 
 * This tool calls the backend satellite agent to generate satellite imagery
 * showing river pollution simulations for a specific monitoring station.
 */

import React, { useEffect, useState } from 'react';
import { extendedTool } from '@openassistant/utils';
import { z } from 'zod';
import styled from 'styled-components';

// API Configuration
// In browser environments, we use a hardcoded default since process.env is not available
const BACKEND_URL = 'http://localhost:8000';

// ==============================================================================
// Styled Components for the Image Viewer
// ==============================================================================

const SimulationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  color: white;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
`;

const StationBadge = styled.span`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const ImageCard = styled.div`
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
`;

const ImageLabel = styled.div<{ variant: 'original' | 'simulated' }>`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${props =>
    props.variant === 'original'
      ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
      : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  };
`;

const Image = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: #a0a0a0;
`;

const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
`;

const FrameNavigation = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
`;

const NavButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const FrameInfo = styled.span`
  font-size: 14px;
  color: #a0a0a0;
`;

// ==============================================================================
// Tool Definition
// ==============================================================================

export const satelliteSimulation = extendedTool({
  description: `Generate satellite imagery simulation for river pollution at a monitoring station.
    This tool calls the backend satellite agent to create visual comparisons showing:
    - Original satellite views of the river
    - Simulated pollution views (high turbidity visualization)
    
    Use this when users want to:
    - See satellite views of a water monitoring station
    - Visualize what river pollution would look like
    - Analyze changes in river conditions over time`,
  parameters: z.object({
    stationCode: z.string().describe('The station code from the water quality database (e.g., "4085")'),
    year: z.number().optional().default(2023).describe('Year to analyze (default: 2023)'),
    simulate: z.boolean().optional().default(true).describe('Generate pollution simulation views')
  }),
  execute: executeSatelliteSimulation,
  component: SatelliteSimulationComponent
});

export type SatelliteSimulationTool = typeof satelliteSimulation;

type ExecuteSatelliteSimulationResult = {
  llmResult: {
    success: boolean;
    stationCode: string;
    message: string;
    totalFrames?: number;
    coords?: { lat: number; lon: number };
    details?: string;
    instruction?: string;
  };
  additionalData?: {
    stationCode: string;
    year: number;
    simulate: boolean;
    backendUrl: string;
  };
};

async function executeSatelliteSimulation({
  stationCode,
  year = 2023,
  simulate = true
}): Promise<ExecuteSatelliteSimulationResult> {
  try {
    // Call the backend API
    const response = await fetch(`${BACKEND_URL}/api/satellite/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        station_code: stationCode,
        year,
        simulate
      })
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.status === 'error') {
      throw new Error(result.message);
    }

    return {
      llmResult: {
        success: true,
        stationCode: result.station_code,
        message: result.message,
        totalFrames: result.total_frames,
        coords: result.coords,
        details: `Successfully generated ${result.total_frames} satellite imagery frames for station ${stationCode}. ` +
          `Location: ${result.coords?.lat.toFixed(4)}, ${result.coords?.lon.toFixed(4)}. ` +
          `Mode: ${result.mode}.`
      },
      additionalData: {
        stationCode,
        year,
        simulate,
        backendUrl: BACKEND_URL
      }
    };
  } catch (error) {
    return {
      llmResult: {
        success: false,
        stationCode,
        message: `Error: ${error}`,
        details: `Failed to generate satellite simulation: ${error}`,
        instruction:
          'The satellite simulation failed. This could be due to: ' +
          '1. Invalid station code - check if the station exists in the database. ' +
          '2. Backend service is not running - ensure the backend is started. ' +
          '3. Earth Engine authentication issues - check service account credentials.'
      }
    };
  }
}

// ==============================================================================
// React Component for Displaying Results
// ==============================================================================

interface SimulationStatusResponse {
  station_code: string;
  exists: boolean;
  original_frames: Array<{ filename: string; url: string; date: string }>;
  simulated_frames: Array<{ filename: string; url: string; date: string }>;
}

export function SatelliteSimulationComponent({
  stationCode,
  year,
  simulate,
  backendUrl = BACKEND_URL
}: {
  stationCode: string;
  year: number;
  simulate: boolean;
  backendUrl?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<SimulationStatusResponse | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${backendUrl}/api/satellite/status/${stationCode}?base_url=${encodeURIComponent(backendUrl)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.statusText}`);
        }

        const data: SimulationStatusResponse = await response.json();
        setFrames(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [stationCode, backendUrl]);

  if (loading) {
    return (
      <SimulationContainer>
        <LoadingState>
          <Spinner />
          <span>Loading satellite imagery for station {stationCode}...</span>
        </LoadingState>
      </SimulationContainer>
    );
  }

  if (error) {
    return (
      <SimulationContainer>
        <ErrorState>
          <strong>Error:</strong> {error}
        </ErrorState>
      </SimulationContainer>
    );
  }

  if (!frames?.exists || frames.original_frames.length === 0) {
    return (
      <SimulationContainer>
        <ErrorState>
          No satellite imagery available for station {stationCode}.
          The simulation may still be processing.
        </ErrorState>
      </SimulationContainer>
    );
  }

  const currentOriginal = frames.original_frames[currentFrameIndex];
  const currentSimulated = simulate ? frames.simulated_frames[currentFrameIndex] : null;

  return (
    <SimulationContainer>
      <Header>
        <Title>🛰️ Satellite Imagery Comparison</Title>
        <StationBadge>Station: {stationCode}</StationBadge>
      </Header>

      <ImageGrid>
        <ImageCard>
          <ImageLabel variant="original">Original ({currentOriginal?.date})</ImageLabel>
          {currentOriginal && (
            <Image
              src={currentOriginal.url}
              alt={`Original frame ${currentFrameIndex + 1}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="%23333" width="200" height="150"/><text fill="%23666" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Image not found</text></svg>';
              }}
            />
          )}
        </ImageCard>

        {simulate && currentSimulated && (
          <ImageCard>
            <ImageLabel variant="simulated">Simulated Pollution ({currentSimulated.date})</ImageLabel>
            <Image
              src={currentSimulated.url}
              alt={`Simulated frame ${currentFrameIndex + 1}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="%23333" width="200" height="150"/><text fill="%23666" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Image not found</text></svg>';
              }}
            />
          </ImageCard>
        )}
      </ImageGrid>

      <FrameNavigation>
        <NavButton
          onClick={() => setCurrentFrameIndex(i => Math.max(0, i - 1))}
          disabled={currentFrameIndex === 0}
        >
          ← Previous
        </NavButton>
        <FrameInfo>
          Frame {currentFrameIndex + 1} of {frames.original_frames.length}
        </FrameInfo>
        <NavButton
          onClick={() => setCurrentFrameIndex(i => Math.min(frames.original_frames.length - 1, i + 1))}
          disabled={currentFrameIndex === frames.original_frames.length - 1}
        >
          Next →
        </NavButton>
      </FrameNavigation>
    </SimulationContainer>
  );
}
