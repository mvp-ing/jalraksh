/**
 * Classification Result Component
 * Displays the Gemini-powered pollution classification
 */

import React from 'react';
import styled from 'styled-components';
import type { ClassificationResult as ClassificationResultType } from '../types/inspector.types';
import { POLLUTION_CATEGORIES } from '../constants/pollution-categories';

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
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AIBadge = styled.span`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
`;

const ConfidenceBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ConfidenceValue = styled.span<{ confidence: number }>`
  font-size: 18px;
  font-weight: 700;
  color: ${props => {
    if (props.confidence >= 80) return '#4CAF50';
    if (props.confidence >= 60) return '#FFC107';
    return '#FF9800';
  }};
`;

const PollutionType = styled.div<{ color: string }>`
  background: ${props => props.color}20;
  border: 1px solid ${props => props.color};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
`;

const PollutionName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
`;

const ActSection = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
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
`;

const Reasoning = styled.div`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
`;

const IndicatorsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Indicator = styled.span`
  background: rgba(156, 39, 176, 0.2);
  color: #ce93d8;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
`;

const RuledOutList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RuledOutItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
`;

const CrossMark = styled.span`
  color: #f44336;
`;

const RecommendedAction = styled.div`
  background: rgba(33, 150, 243, 0.1);
  border-left: 3px solid #2196F3;
  padding: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
`;

const FineInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
`;

const FineLabel = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
`;

const FineAmount = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #f44336;
`;

interface ClassificationResultProps {
  result: ClassificationResultType;
}

export const ClassificationResultComponent: React.FC<ClassificationResultProps> = ({ result }) => {
  const category = POLLUTION_CATEGORIES[result.pollution_category as keyof typeof POLLUTION_CATEGORIES];
  const color = category?.color || '#9E9E9E';

  return (
    <Container>
      <Header>
        <Title>
          Pollution Classification
          <AIBadge>Gemini AI</AIBadge>
        </Title>
        <ConfidenceBar>
          <ConfidenceValue confidence={result.confidence}>
            {result.confidence.toFixed(1)}%
          </ConfidenceValue>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>confidence</span>
        </ConfidenceBar>
      </Header>

      <PollutionType color={color}>
        <PollutionName>{result.pollution_type}</PollutionName>
        <ActSection>{result.act_section}</ActSection>
      </PollutionType>

      <Section>
        <SectionTitle>AI Reasoning</SectionTitle>
        <Reasoning>{result.reasoning}</Reasoning>
      </Section>

      <Section>
        <SectionTitle>Key Indicators</SectionTitle>
        <IndicatorsList>
          {result.key_indicators.map((indicator, index) => (
            <Indicator key={index}>{indicator.replace(/_/g, ' ')}</Indicator>
          ))}
        </IndicatorsList>
      </Section>

      {result.ruled_out.length > 0 && (
        <Section>
          <SectionTitle>Ruled Out</SectionTitle>
          <RuledOutList>
            {result.ruled_out.map((item, index) => (
              <RuledOutItem key={index}>
                <CrossMark>✗</CrossMark>
                <span>
                  <strong>{item.type}</strong>: {item.reason}
                </span>
              </RuledOutItem>
            ))}
          </RuledOutList>
        </Section>
      )}

      <Section>
        <SectionTitle>Recommended Action</SectionTitle>
        <RecommendedAction>{result.recommended_action}</RecommendedAction>
      </Section>

      <FineInfo>
        <FineLabel>Base Fine Amount</FineLabel>
        <FineAmount>Rs. {result.base_fine.toLocaleString()}</FineAmount>
      </FineInfo>
    </Container>
  );
};

export default ClassificationResultComponent;
