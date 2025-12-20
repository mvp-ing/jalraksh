// SPDX-License-Identifier: MIT
// Copyright Jalraksh

/**
 * Share Panel Control
 * 
 * A map control button that opens the share modal for generating shareable links.
 * Follows the same pattern as SqlPanelControl to integrate with the Kepler.gl map controls.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

import { MapControlButton, MapControlTooltipFactory } from '@jalrakshak/components';
import { MapControls } from '@jalrakshak/types';
import {
  generateShareableLink,
  generateLightShareLink,
  copyToClipboard,
  SEGMENT_NAMES,
} from '../../utils/share-url';

// Styled components for the share modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  max-width: 560px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  line-height: 1;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionLabel = styled.label`
  display: block;
  color: #a0aec0;
  font-size: 0.85rem;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 179, 237, 0.5);
  }

  &:focus {
    outline: none;
    border-color: #63b3ed;
    box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.2);
  }

  option {
    background: #1a1a2e;
    color: #fff;
  }
`;

const UrlContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const UrlDisplay = styled.div`
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8rem;
  color: #63b3ed;
  word-break: break-all;
  line-height: 1.5;
  max-height: 80px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const CopyBtn = styled.button`
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(72, 187, 120, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #48bb78;
  font-size: 0.9rem;
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(72, 187, 120, 0.15);
  border-radius: 8px;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const InfoText = styled.p`
  color: #718096;
  font-size: 0.8rem;
  margin: 0;
  line-height: 1.5;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const ToggleLabel = styled.span`
  color: #a0aec0;
  font-size: 0.85rem;
`;

const Toggle = styled.button<{ $active: boolean }>`
  position: relative;
  width: 50px;
  height: 26px;
  background: ${props => props.$active ? 'linear-gradient(135deg, #48bb78, #38a169)' : 'rgba(255, 255, 255, 0.1)'};
  border: none;
  border-radius: 13px;
  cursor: pointer;
  transition: all 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${props => props.$active ? '26px' : '3px'};
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

// Share icon SVG component
const ShareIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
);

export type SharePanelControlProps = {
  mapControls: MapControls;
  mapState?: any;
  visState?: any;
};

SharePanelControlFactory.deps = [MapControlTooltipFactory];

export default function SharePanelControlFactory(
  MapControlTooltip: ReturnType<typeof MapControlTooltipFactory>
): React.FC<SharePanelControlProps> {

  const SharePanelControl: React.FC<SharePanelControlProps> = ({ mapControls, mapState, visState }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [includeFullConfig, setIncludeFullConfig] = useState(true);

    // Generate share URL
    const generateUrl = useCallback(() => {
      try {
        if (includeFullConfig) {
          const keplerConfig = {
            version: 'v1',
            config: {
              visState: visState,
              mapState: mapState,
            },
          };

          return generateShareableLink({
            keplerConfig,
            segmentId: selectedSegment || null,
            mapState: mapState,
            timestamp: visState?.filters?.[0]?.value?.[0]
              ? new Date(visState.filters[0].value[0]).toISOString()
              : null,
          });
        } else {
          return generateLightShareLink({
            segmentId: selectedSegment || null,
            timestamp: visState?.filters?.[0]?.value?.[0]
              ? new Date(visState.filters[0].value[0]).toISOString()
              : null,
            zoom: mapState?.zoom || 14,
          });
        }
      } catch (error) {
        console.error('Failed to generate share URL:', error);
        return 'Error generating share link';
      }
    }, [includeFullConfig, selectedSegment, mapState, visState]);

    const handleOpen = useCallback((event) => {
      event.preventDefault();
      setShareUrl(generateUrl());
      setIsModalOpen(true);
    }, [generateUrl]);

    const handleClose = useCallback(() => {
      setIsModalOpen(false);
      setCopied(false);
    }, []);

    const handleCopy = useCallback(async () => {
      const success = await copyToClipboard(shareUrl);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }, [shareUrl]);

    const handleSegmentChange = useCallback((e) => {
      setSelectedSegment(e.target.value);
    }, []);

    const handleToggleConfig = useCallback(() => {
      setIncludeFullConfig(prev => !prev);
    }, []);

    // Update URL when options change
    React.useEffect(() => {
      if (isModalOpen) {
        setShareUrl(generateUrl());
        setCopied(false);
      }
    }, [isModalOpen, selectedSegment, includeFullConfig, generateUrl]);

    return (
      <>
        <MapControlTooltip
          id="share-visualization"
          message="Share Visualization"
        >
          <MapControlButton
            className="map-control-button share-panel"
            onClick={handleOpen}
            active={isModalOpen}
          >
            <ShareIcon />
          </MapControlButton>
        </MapControlTooltip>

        {isModalOpen && (
          <ModalOverlay onClick={handleClose}>
            <ModalContainer onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  <span role="img" aria-label="link">🔗</span>
                  Share Visualization
                </ModalTitle>
                <CloseButton onClick={handleClose}>×</CloseButton>
              </ModalHeader>

              <Section>
                <SectionLabel>River Segment (Optional)</SectionLabel>
                <Select value={selectedSegment} onChange={handleSegmentChange}>
                  <option value="">All segments - Current view</option>
                  {Object.entries(SEGMENT_NAMES).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name as string} ({id})
                    </option>
                  ))}
                </Select>
              </Section>

              <ToggleContainer>
                <Toggle
                  $active={includeFullConfig}
                  onClick={handleToggleConfig}
                  aria-label="Toggle full configuration"
                />
                <ToggleLabel>
                  {includeFullConfig
                    ? 'Include full visualization config (larger URL)'
                    : 'Light link - segment only (shorter URL)'}
                </ToggleLabel>
              </ToggleContainer>

              <Section>
                <SectionLabel>Shareable Link</SectionLabel>
                <UrlContainer>
                  <UrlDisplay>{shareUrl}</UrlDisplay>
                  <ButtonRow>
                    <CopyBtn onClick={handleCopy} disabled={!shareUrl}>
                      {copied ? '✓ Copied!' : '📋 Copy Link'}
                    </CopyBtn>
                  </ButtonRow>
                </UrlContainer>
                {copied && (
                  <SuccessMessage>
                    ✓ Link copied to clipboard! Share it with others.
                  </SuccessMessage>
                )}
              </Section>

              <InfoText>
                {includeFullConfig
                  ? 'This link includes your current map view, layer settings, and filter state. Anyone with this link will see the exact same visualization.'
                  : 'This is a lightweight link that focuses on the selected river segment. The recipient will see default layer settings.'}
              </InfoText>
            </ModalContainer>
          </ModalOverlay>
        )}
      </>
    );
  };

  return SharePanelControl;
}
