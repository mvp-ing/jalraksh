/**
 * Pollution Forecast Section Component
 * Displays STGNN-based pollution predictions with controls
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { ForecastCard } from './forecast-card';
import type {
  ForecastAlert,
  ForecastResponse,
  ForecastRequestParams,
  ForecastSeverity,
} from '../types/inspector.types';

const Section = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const SectionHeader = styled.div<{ isExpanded: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  background: ${props => props.isExpanded ? 'rgba(33, 150, 243, 0.12)' : 'transparent'};
  transition: background 0.2s;

  &:hover {
    background: rgba(33, 150, 243, 0.12);
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExpandIcon = styled.span<{ isExpanded: boolean }>`
  display: inline-block;
  transition: transform 0.2s;
  transform: rotate(${props => props.isExpanded ? '90deg' : '0deg'});
  color: #64B5F6;
`;

const SectionTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AlertCount = styled.span`
  background: #2196F3;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 10px;
`;

const SectionContent = styled.div<{ isExpanded: boolean }>`
  display: ${props => props.isExpanded ? 'block' : 'none'};
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 100px;
`;

const ControlLabel = styled.label`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  padding: 6px 8px;

  &:focus {
    outline: none;
    border-color: #2196F3;
  }
`;

const HorizonToggles = styled.div`
  display: flex;
  gap: 4px;
`;

const HorizonToggle = styled.button<{ isActive: boolean }>`
  background: ${props => props.isActive ? '#2196F3' : 'rgba(255, 255, 255, 0.08)'};
  border: 1px solid ${props => props.isActive ? '#2196F3' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 4px;
  color: ${props => props.isActive ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.isActive ? '#1976D2' : 'rgba(33, 150, 243, 0.12)'};
  }
`;

const GenerateButton = styled.button<{ isLoading: boolean }>`
  width: 100%;
  padding: 10px;
  background: ${props => props.isLoading ? 'rgba(33, 150, 243, 0.3)' : 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)'};
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: ${props => props.isLoading ? 'not-allowed' : 'pointer'};
  margin-bottom: 12px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const ForecastList = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
`;

const ModelInfo = styled.div`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ErrorMessage = styled.div`
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 10px;
  color: #EF9A9A;
  font-size: 12px;
  margin-bottom: 12px;
`;

interface PollutionForecastSectionProps {
  forecast: {
    data: ForecastResponse | null;
    loading: boolean;
    error: string | null;
  };
  onFetchForecast: (params?: ForecastRequestParams) => Promise<ForecastResponse | null>;
  selectedForecastId?: string | null;
  onSelectForecast?: (forecast: ForecastAlert) => void;
}

export const PollutionForecastSection: React.FC<PollutionForecastSectionProps> = ({
  forecast,
  onFetchForecast,
  selectedForecastId,
  onSelectForecast,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [numStations, setNumStations] = useState(15);
  const [selectedHorizons, setSelectedHorizons] = useState<number[]>([1, 2, 3]);
  const [minSeverity, setMinSeverity] = useState<ForecastSeverity>('CRITICAL');

  const toggleHorizon = useCallback((horizon: number) => {
    setSelectedHorizons(prev => {
      if (prev.includes(horizon)) {
        // Don't allow deselecting all horizons
        if (prev.length === 1) return prev;
        return prev.filter(h => h !== horizon);
      } else {
        return [...prev, horizon].sort();
      }
    });
  }, []);

  const handleGenerate = useCallback(() => {
    onFetchForecast({
      num_stations: numStations,
      horizons: selectedHorizons,
      min_severity: minSeverity,
    });
  }, [onFetchForecast, numStations, selectedHorizons, minSeverity]);

  const alertCount = forecast.data?.forecasts.length || 0;

  return (
    <Section>
      <SectionHeader
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <HeaderLeft>
          <ExpandIcon isExpanded={isExpanded}>&#9654;</ExpandIcon>
          <SectionTitle>Pollution Forecast</SectionTitle>
          {alertCount > 0 && <AlertCount>{alertCount} alerts</AlertCount>}
        </HeaderLeft>
      </SectionHeader>

      <SectionContent isExpanded={isExpanded}>
        <Controls>
          <ControlGroup>
            <ControlLabel>Stations</ControlLabel>
            <Select
              value={numStations}
              onChange={e => setNumStations(parseInt(e.target.value, 10))}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </Select>
          </ControlGroup>

          <ControlGroup>
            <ControlLabel>Horizon</ControlLabel>
            <HorizonToggles>
              {[1, 2, 3].map(h => (
                <HorizonToggle
                  key={h}
                  isActive={selectedHorizons.includes(h)}
                  onClick={() => toggleHorizon(h)}
                >
                  {h}M
                </HorizonToggle>
              ))}
            </HorizonToggles>
          </ControlGroup>

          <ControlGroup>
            <ControlLabel>Min Severity</ControlLabel>
            <Select
              value={minSeverity}
              onChange={e => setMinSeverity(e.target.value as ForecastSeverity)}
            >
              <option value="CRITICAL">Critical only</option>
              <option value="HIGH">High+</option>
              <option value="MEDIUM">Medium+</option>
              <option value="LOW">Low+</option>
              <option value="SAFE">All</option>
            </Select>
          </ControlGroup>
        </Controls>

        <GenerateButton
          isLoading={forecast.loading}
          onClick={handleGenerate}
          disabled={forecast.loading}
        >
          {forecast.loading ? 'Generating Forecast...' : 'Generate Forecast'}
        </GenerateButton>

        {forecast.error && (
          <ErrorMessage>
            {forecast.error}
          </ErrorMessage>
        )}

        {forecast.data ? (
          <>
            <ForecastList>
              {forecast.data.forecasts.length > 0 ? (
                forecast.data.forecasts.map(f => (
                  <ForecastCard
                    key={f.id}
                    forecast={f}
                    isSelected={selectedForecastId === f.id}
                    onClick={onSelectForecast}
                  />
                ))
              ) : (
                <EmptyState>
                  No alerts meeting the severity threshold.
                  <br />
                  Try lowering the minimum severity.
                </EmptyState>
              )}
            </ForecastList>
            <ModelInfo>
              STGNN Model | {forecast.data.total_stations_analyzed} stations analyzed |
              Horizons: {forecast.data.horizons_analyzed.join(', ')} months
            </ModelInfo>
          </>
        ) : (
          <EmptyState>
            Click "Generate Forecast" to predict future pollution levels
            <br />
            using STGNN deep learning model.
          </EmptyState>
        )}
      </SectionContent>
    </Section>
  );
};

export default PollutionForecastSection;
