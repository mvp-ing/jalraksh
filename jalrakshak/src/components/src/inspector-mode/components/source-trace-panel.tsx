/**
 * Source Trace Panel Component
 * Displays upstream pollution trace path with factory suspects
 */

import React from 'react';
import styled from 'styled-components';
import type { SourceTraceResponse, TraceNode, FactorySuspect } from '../types/inspector.types';
import { FactoryInfoCard } from './factory-info-card';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #fff;
`;

const TotalDistance = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
`;

const Section = styled.div`
  margin-bottom: 16px;
`;

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RiverBadge = styled.span`
  background: rgba(33, 150, 243, 0.2);
  color: #64B5F6;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
`;

const TracePath = styled.div`
  position: relative;
  padding-left: 24px;
`;

const TraceNodeItem = styled.div<{ isFirst?: boolean }>`
  position: relative;
  padding: 8px 0;
  border-left: 2px solid ${props => props.isFirst ? '#F44336' : 'rgba(255, 255, 255, 0.2)'};
  margin-left: 6px;
  padding-left: 16px;

  &::before {
    content: '';
    position: absolute;
    left: -7px;
    top: 12px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${props => props.isFirst ? '#F44336' : '#2196F3'};
    border: 2px solid #1a1a2e;
  }
`;

const NodeName = styled.div`
  font-size: 13px;
  color: #fff;
  font-weight: 500;
`;

const NodeMeta = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
`;

const StationCode = styled.span`
  font-family: monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 4px;
  border-radius: 2px;
  margin-right: 8px;
`;

const SuspectsContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const NoSuspects = styled.div`
  text-align: center;
  padding: 24px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: rgba(255, 255, 255, 0.5);
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: rgba(255, 255, 255, 0.7);
`;

interface SourceTracePanelProps {
  trace: SourceTraceResponse | null;
  loading: boolean;
  selectedFactory: FactorySuspect | null;
  onSelectFactory: (factory: FactorySuspect) => void;
  hasSelection: boolean;
}

export const SourceTracePanel: React.FC<SourceTracePanelProps> = ({
  trace,
  loading,
  selectedFactory,
  onSelectFactory,
  hasSelection,
}) => {
  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Source Tracing</Title>
        </Header>
        <LoadingState>
          Tracing upstream...
        </LoadingState>
      </Container>
    );
  }

  if (!trace) {
    return (
      <Container>
        <Header>
          <Title>Source Tracing</Title>
        </Header>
        <EmptyState>
          {hasSelection
            ? 'Run "Trace Source" to trace upstream and identify potential polluters.'
            : 'Select an alert or forecast to begin source tracing.'}
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Source Tracing</Title>
        <TotalDistance>{trace.total_distance_km.toFixed(1)} km traced</TotalDistance>
      </Header>

      <Section>
        <SectionTitle>
          Trace Path
          <RiverBadge>{trace.river_cluster}</RiverBadge>
        </SectionTitle>
        <TracePath>
          {trace.path.map((node, index) => (
            <TraceNodeItem key={node.station_code} isFirst={index === 0}>
              <NodeName>{node.station_name}</NodeName>
              <NodeMeta>
                <StationCode>{node.station_code}</StationCode>
                {node.distance_km > 0 && `${node.distance_km.toFixed(1)} km upstream`}
              </NodeMeta>
            </TraceNodeItem>
          ))}
        </TracePath>
      </Section>

      <Section>
        <SectionTitle>
          Suspected Factories ({trace.suspected_factories.length})
        </SectionTitle>
        {trace.suspected_factories.length > 0 ? (
          <SuspectsContainer>
            {trace.suspected_factories.map((factory) => (
              <FactoryInfoCard
                key={factory.license_id}
                factory={factory}
                isSelected={selectedFactory?.license_id === factory.license_id}
                onClick={() => onSelectFactory(factory)}
              />
            ))}
          </SuspectsContainer>
        ) : (
          <NoSuspects>
            No factories found along the trace path.
          </NoSuspects>
        )}
      </Section>
    </Container>
  );
};

export default SourceTracePanel;
