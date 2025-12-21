// SPDX-License-Identifier: MIT
// Copyright Jalraksh

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight } from '../common/icons';

const CarouselContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 560px;
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
  background: ${props => props.theme.panelBackgroundHover};
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    ${props => props.theme.panelBackground} 0%, 
    ${props => props.theme.panelBackgroundHover} 100%
  );
  overflow: hidden;
  
  &:hover .zoom-hint {
    opacity: 1;
  }
`;

const ZoomableImageWrapper = styled.div<{ $scale: number; $translateX: number; $translateY: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: ${props => props.$scale > 1 ? 'grab' : 'zoom-in'};
  
  &:active {
    cursor: ${props => props.$scale > 1 ? 'grabbing' : 'zoom-in'};
  }
`;

const CarouselImage = styled.img<{ $scale: number; $translateX: number; $translateY: number }>`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  transition: ${props => props.$scale === 1 ? 'transform 0.2s ease' : 'none'};
  transform: scale(${props => props.$scale}) translate(${props => props.$translateX}px, ${props => props.$translateY}px);
  transform-origin: center center;
  user-select: none;
  -webkit-user-drag: none;
`;

const ZoomHint = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: ${props => props.theme.textColorHl};
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 3;
`;

const ZoomLevel = styled.div`
  position: absolute;
  top: 8px;
  right: 50px;
  background: rgba(0, 0, 0, 0.7);
  color: ${props => props.theme.textColorHl};
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  z-index: 3;
`;

const ZoomControls = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
  z-index: 3;
`;

const ZoomButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: ${props => props.theme.textColorHl};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.activeColor};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const PlaceholderImage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: ${props => props.theme.textColorHl};
  font-size: 12px;
  text-align: center;
  padding: 16px;
  
  svg {
    margin-bottom: 8px;
    opacity: 0.6;
  }
`;

const NavigationButton = styled.button<{ position: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.position}: 8px;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: ${props => props.theme.panelBackground};
  color: ${props => props.theme.textColorHl};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: all 0.2s ease;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  &:hover {
    opacity: 1;
    background: ${props => props.theme.activeColor};
    transform: translateY(-50%) scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    &:hover {
      transform: translateY(-50%);
      background: ${props => props.theme.panelBackground};
    }
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ImageCounter = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: ${props => props.theme.textColorHl};
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.5px;
  z-index: 3;
`;

const CarouselHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: ${props => props.theme.panelBackground};
  border-bottom: 1px solid ${props => props.theme.panelBorderColor};
  
  svg {
    margin-right: 6px;
    opacity: 0.8;
  }
`;

const HeaderTitle = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${props => props.theme.textColorHl};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Satellite icon
const SatelliteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
    <path d="M2 12C2 6.5 6.5 2 12 2s10 4.5 10 10-4.5 10-10 10S2 17.5 2 12z" />
    <path d="M17.5 6.5L22 2M6.5 17.5L2 22M17.5 17.5L22 22M6.5 6.5L2 2" />
  </svg>
);

interface ImageCarouselProps {
  images: string[];
  title?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  title = 'Sentinel Images'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({});
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom when changing images
  useEffect(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, [currentIndex]);

  const handlePrevious = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : prev));
  }, [images.length]);

  const handleImageError = useCallback((index: number) => {
    setImageError(prev => ({ ...prev, [index]: true }));
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale(prev => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
      // Reset position when zooming back to 1x
      if (newScale === 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
      return newScale;
    });
  }, []);

  // Handle zoom buttons
  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(MAX_SCALE, prev + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => {
      const newScale = Math.max(MIN_SCALE, prev - ZOOM_STEP);
      if (newScale === 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
      return newScale;
    });
  }, []);

  const handleResetZoom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  // Handle drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - translateX, y: e.clientY - translateY });
    }
  }, [scale, translateX, translateY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = (e.clientX - dragStart.x) / scale;
      const newY = (e.clientY - dragStart.y) / scale;

      // Limit panning based on scale
      const maxPan = (scale - 1) * 50;
      setTranslateX(Math.min(maxPan, Math.max(-maxPan, newX)));
      setTranslateY(Math.min(maxPan, Math.max(-maxPan, newY)));
    }
  }, [isDragging, scale, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double click to toggle zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setTranslateX(0);
      setTranslateY(0);
    } else {
      setScale(2);
    }
  }, [scale]);

  if (!images || images.length === 0) {
    return null;
  }

  const showNavigation = images.length > 1;
  const currentImage = images[currentIndex];
  const hasError = imageError[currentIndex];

  return (
    <CarouselContainer>
      <CarouselHeader>
        <SatelliteIcon />
        <HeaderTitle>{title}</HeaderTitle>
      </CarouselHeader>

      <ImageContainer
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      >
        {hasError ? (
          <PlaceholderImage>
            <SatelliteIcon />
            <span>Image not available</span>
            <span style={{ opacity: 0.6, fontSize: '10px', marginTop: '4px' }}>
              {currentImage.split('/').pop()}
            </span>
          </PlaceholderImage>
        ) : (
          <>
            <ZoomableImageWrapper
              $scale={scale}
              $translateX={translateX}
              $translateY={translateY}
            >
              <CarouselImage
                src={currentImage}
                alt={`Sentinel image ${currentIndex + 1}`}
                onError={() => handleImageError(currentIndex)}
                $scale={scale}
                $translateX={translateX}
                $translateY={translateY}
                draggable={false}
              />
            </ZoomableImageWrapper>
            {/* {scale === 1 && (
              <ZoomHint className="zoom-hint">
                Scroll to zoom • Double-click to magnify
              </ZoomHint>
            )} */}
          </>
        )}

        {/* Zoom level indicator */}
        {scale > 1 && (
          <ZoomLevel>{Math.round(scale * 100)}%</ZoomLevel>
        )}

        {/* Zoom controls */}
        <ZoomControls>
          <ZoomButton
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            title="Zoom out"
          >
            −
          </ZoomButton>
          <ZoomButton
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            title="Zoom in"
          >
            +
          </ZoomButton>
          {scale > 1 && (
            <ZoomButton
              onClick={handleResetZoom}
              title="Reset zoom"
            >
              ⟲
            </ZoomButton>
          )}
        </ZoomControls>

        {showNavigation && (
          <>
            <NavigationButton
              position="left"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              aria-label="Previous image"
            >
              <ArrowLeft />
            </NavigationButton>
            <NavigationButton
              position="right"
              onClick={handleNext}
              disabled={currentIndex === images.length - 1}
              aria-label="Next image"
            >
              <ArrowRight />
            </NavigationButton>
          </>
        )}

        <ImageCounter>
          {currentIndex + 1} / {images.length}
        </ImageCounter>
      </ImageContainer>
    </CarouselContainer>
  );
};

export default ImageCarousel;
