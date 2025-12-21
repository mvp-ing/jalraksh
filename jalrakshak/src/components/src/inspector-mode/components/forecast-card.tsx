/**
 * Forecast Card Component
 * Displays a single pollution forecast alert from STGNN model
 */

import React from 'react';
import styled from 'styled-components';
import type { ForecastAlert, ForecastSeverity } from '../types/inspector.types';
import { FORECAST_SEVERITY_COLORS, HORIZON_COLORS } from '../constants/pollution-categories';

const Card = styled.div<{ severity: ForecastSeverity; isSelected: boolean; isClickable: boolean }>`
  background: ${props => props.isSelected ? 'rgba(33, 150, 243, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border-left: 4px solid ${props => FORECAST_SEVERITY_COLORS[props.severity] || '#9E9E9E'};
  border: 1px solid ${props => props.isSelected ? 'rgba(33, 150, 243, 0.5)' : 'transparent'};
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: ${props => (props.isClickable ? 'pointer' : 'default')};
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.isClickable ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const AlertMessage = styled.div`
  font-weight: 500;
  font-size: 13px;
  color: #fff;
  flex: 1;
  margin-right: 8px;
`;

const HorizonBadge = styled.span<{ horizon: number }>`
  background: ${props => HORIZON_COLORS[props.horizon as keyof typeof HORIZON_COLORS] || '#9E9E9E'};
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
`;

const StationInfo = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
`;

const StationCode = styled.span`
  font-family: monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 8px;
`;

const ProbabilityBar = styled.div`
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
`;

const ProbabilitySegment = styled.div<{ severity: string; width: number }>`
  width: ${props => props.width}%;
  background: ${props => FORECAST_SEVERITY_COLORS[props.severity as keyof typeof FORECAST_SEVERITY_COLORS] || '#9E9E9E'};
  transition: width 0.3s ease;
`;

const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
`;

const SeverityLabel = styled.span<{ severity: ForecastSeverity }>`
  color: ${props => FORECAST_SEVERITY_COLORS[props.severity] || '#9E9E9E'};
  font-weight: 600;
`;

const Confidence = styled.span`
  font-family: monospace;
`;

interface ForecastCardProps {
  forecast: ForecastAlert;
  isSelected?: boolean;
  onClick?: (forecast: ForecastAlert) => void;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ forecast, isSelected = false, onClick }) => {
  const confidencePercent = (forecast.confidence * 100).toFixed(0);
  const severityOrder: ForecastSeverity[] = ['SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const riverCluster = forecast.river_cluster && forecast.river_cluster !== 'UNKNOWN'
    ? forecast.river_cluster
    : '';
  const location = forecast.location && forecast.location.toLowerCase() !== 'unknown'
    ? forecast.location
    : '';
  const locationLine = [location, riverCluster].filter(Boolean).join(' | ');

  return (
    <Card
      severity={forecast.predicted_severity}
      isSelected={isSelected}
      isClickable={Boolean(onClick)}
      onClick={() => onClick?.(forecast)}
    >
      <Header>
        <AlertMessage>{forecast.alert_message}</AlertMessage>
        <HorizonBadge horizon={forecast.forecast_horizon_months}>
          {forecast.forecast_horizon_months}M
        </HorizonBadge>
      </Header>

      <StationInfo>
        <StationCode>{forecast.station_code}</StationCode>
        {forecast.station_name}
      </StationInfo>

      {locationLine && (
        <StationInfo>
          {locationLine}
        </StationInfo>
      )}

      <ProbabilityBar>
        {severityOrder.map((sev) => (
          <ProbabilitySegment
            key={sev}
            severity={sev}
            width={(forecast.probabilities[sev] || 0) * 100}
          />
        ))}
      </ProbabilityBar>

      <Meta>
        <SeverityLabel severity={forecast.predicted_severity}>
          {forecast.predicted_severity}
        </SeverityLabel>
        <Confidence>Confidence: {confidencePercent}%</Confidence>
      </Meta>
    </Card>
  );
};

export default ForecastCard;
