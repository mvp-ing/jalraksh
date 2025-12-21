/**
 * Alert Card Component
 * Displays a single pollution alert with severity indicator
 */

import React from 'react';
import styled from 'styled-components';
import type { InspectorAlert } from '../types/inspector.types';
import { SEVERITY_COLORS, STATUS_COLORS } from '../constants/pollution-categories';

const Card = styled.div<{ severity: string; isSelected: boolean }>`
  background: ${props => props.isSelected ? 'rgba(33, 150, 243, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border-left: 4px solid ${props => SEVERITY_COLORS[props.severity as keyof typeof SEVERITY_COLORS] || '#9E9E9E'};
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #fff;
`;

const SeverityBadge = styled.span<{ severity: string }>`
  background: ${props => SEVERITY_COLORS[props.severity as keyof typeof SEVERITY_COLORS] || '#9E9E9E'};
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
`;

const Location = styled.div`
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

const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
`;

const StatusDot = styled.span<{ status: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => STATUS_COLORS[props.status as keyof typeof STATUS_COLORS] || '#9E9E9E'};
  margin-right: 4px;
`;

const Score = styled.span`
  font-family: monospace;
`;

interface AlertCardProps {
  alert: InspectorAlert;
  isSelected: boolean;
  onClick: (alert: InspectorAlert) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, isSelected, onClick }) => {
  const formattedTime = new Date(alert.timestamp).toLocaleString();
  const severityScore = (alert.severity_score * 100).toFixed(0);

  return (
    <Card
      severity={alert.severity}
      isSelected={isSelected}
      onClick={() => onClick(alert)}
    >
      <Header>
        <Title>{alert.anomaly_type}</Title>
        <SeverityBadge severity={alert.severity}>
          {alert.severity}
        </SeverityBadge>
      </Header>

      <Location>
        <StationCode>{alert.station_code}</StationCode>
        {alert.station_name}
      </Location>

      <Location>
        {alert.location} | {alert.river_cluster}
      </Location>

      <Meta>
        <span>
          <StatusDot status={alert.status} />
          {alert.status}
        </span>
        <span>{formattedTime}</span>
        <Score>Score: {severityScore}%</Score>
      </Meta>
    </Card>
  );
};

export default AlertCard;
