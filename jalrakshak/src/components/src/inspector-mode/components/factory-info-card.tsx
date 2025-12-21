/**
 * Factory Info Card Component
 * Displays factory details with permit status
 */

import React from 'react';
import styled from 'styled-components';
import type { FactorySuspect, FactoryDetails } from '../types/inspector.types';
import { PERMIT_STATUS_COLORS } from '../constants/pollution-categories';

const Card = styled.div<{ isSelected?: boolean }>`
  background: ${props => props.isSelected ? 'rgba(244, 67, 54, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.isSelected ? '#f44336' : 'transparent'};
  border-radius: 8px;
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

const CompanyName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #fff;
`;

const PermitBadge = styled.span<{ status: string }>`
  background: ${props => PERMIT_STATUS_COLORS[props.status as keyof typeof PERMIT_STATUS_COLORS] || '#9E9E9E'};
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
`;

const IndustryType = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
`;

const LicenseId = styled.div`
  font-family: monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
`;

const SuspicionBar = styled.div`
  margin-top: 8px;
`;

const SuspicionLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
`;

const BarContainer = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const BarFill = styled.div<{ percentage: number }>`
  height: 100%;
  width: ${props => props.percentage}%;
  background: linear-gradient(90deg, #FFC107 0%, #F44336 100%);
  border-radius: 3px;
`;

const SuspicionHint = styled.div`
  margin-top: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
`;

const DetailsSection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
`;

const DetailLabel = styled.span`
  color: rgba(255, 255, 255, 0.5);
`;

const DetailValue = styled.span`
  color: rgba(255, 255, 255, 0.9);
`;

const ViolationBadge = styled.span`
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
`;

interface FactoryInfoCardProps {
  factory: FactorySuspect | FactoryDetails;
  isSelected?: boolean;
  showDetails?: boolean;
  onClick?: (factory: FactorySuspect | FactoryDetails) => void;
}

export const FactoryInfoCard: React.FC<FactoryInfoCardProps> = ({
  factory,
  isSelected = false,
  showDetails = false,
  onClick,
}) => {
  const isSuspect = 'suspicion_score' in factory;
  const suspicionScore = isSuspect ? (factory as FactorySuspect).suspicion_score * 100 : 0;

  return (
    <Card isSelected={isSelected} onClick={() => onClick?.(factory)}>
      <Header>
        <CompanyName>{factory.company_name}</CompanyName>
        <PermitBadge status={factory.permit_status || (factory as FactoryDetails).status}>
          {factory.permit_status || (factory as FactoryDetails).status}
        </PermitBadge>
      </Header>

      <IndustryType>{factory.industry_type}</IndustryType>
      <LicenseId>{factory.license_id}</LicenseId>

      <MetaRow>
        <span>
          Distance: {(factory.distance_from_station_km || 0).toFixed(1)} km
        </span>
        {factory.valid_upto && (
          <span>Valid until: {factory.valid_upto}</span>
        )}
      </MetaRow>

      {isSuspect && (
        <SuspicionBar>
          <SuspicionLabel>
            <span>Suspicion Score</span>
            <span>{suspicionScore.toFixed(1)}%</span>
          </SuspicionLabel>
          <BarContainer>
            <BarFill percentage={suspicionScore} />
          </BarContainer>
          <SuspicionHint>
            Factors: distance, permit status, industry match, violations, time, upstream.
          </SuspicionHint>
        </SuspicionBar>
      )}

      {isSuspect && (factory as FactorySuspect).historical_violations > 0 && (
        <div style={{ marginTop: '8px' }}>
          <ViolationBadge>
            {(factory as FactorySuspect).historical_violations} past violation(s)
          </ViolationBadge>
        </div>
      )}

      {showDetails && 'authorized_limits' in factory && (
        <DetailsSection>
          <DetailRow>
            <DetailLabel>Max Discharge</DetailLabel>
            <DetailValue>
              {(factory as FactoryDetails).authorized_limits.max_discharge_kld} KLD
            </DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Primary Pollutant</DetailLabel>
            <DetailValue>
              {(factory as FactoryDetails).authorized_limits.primary_pollutant}
            </DetailValue>
          </DetailRow>
          {(factory as FactoryDetails).compliance_history?.last_inspection && (
            <DetailRow>
              <DetailLabel>Last Inspection</DetailLabel>
              <DetailValue>
                {(factory as FactoryDetails).compliance_history.last_inspection}
              </DetailValue>
            </DetailRow>
          )}
        </DetailsSection>
      )}
    </Card>
  );
};

export default FactoryInfoCard;
