// SPDX-License-Identifier: MIT
// Copyright Jalraksh

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { CompareType, Field, Merge, TooltipField } from '@jalrakshak/types';
import { CenterFlexbox } from '../common/styled-components';
import { Layers } from '../common/icons';
import PropTypes from 'prop-types';
import { notNullorUndefined } from '@jalrakshak/common-utils';
import { DataRow } from '@jalrakshak/utils';
import { Layer } from '@jalrakshak/layers';
import {
  AggregationLayerHoverData,
  LayerHoverProp,
  getTooltipDisplayDeltaValue,
  getTooltipDisplayValue
} from '@jalrakshak/reducers';
import { useIntl } from 'react-intl';
import { VisState } from '@jalrakshak/schemas';
import { capitalizeFirstLetter } from '@jalrakshak/utils';
import ImageCarousel from './image-carousel';

export const StyledLayerName = styled(CenterFlexbox)`
  color: ${props => props.theme.textColorHl};
  font-size: 12px;
  letter-spacing: 0.43px;
  text-transform: capitalize;

  svg {
    margin-right: 4px;
  }
`;

const StyledTable = styled.table`
  & .row__delta-value {
    text-align: right;
    margin-left: 6px;

    &.positive {
      color: ${props => props.theme.notificationColors.success};
    }

    &.negative {
      color: ${props => props.theme.negativeBtnActBgd};
    }
  }
  & .row__value,
  & .row__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: no-wrap;
  }
`;

const StyledDivider = styled.div`
  margin-left: -14px;
  margin-right: -14px;
  border-bottom: 1px solid ${props => props.theme.panelBorderColor};
`;

// Satellite Button
const SatelliteButtonContainer = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.panelBorderColor};
`;

const SatelliteButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: ${props => props.theme.panelBackground};
  border-radius: 16px;
  padding: 24px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid ${props => props.theme.panelBorderColor};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.panelBorderColor};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: ${props => props.theme.textColorHl};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.textColor};
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  
  &:hover {
    background: ${props => props.theme.panelBackgroundHover};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 20px;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: ${props => props.theme.textColor};
  font-size: 14px;
  margin: 0;
`;

const ErrorMessage = styled.div`
  padding: 20px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  text-align: center;
`;

const BACKEND_URL = 'http://localhost:8000';

// Satellite Modal Component
interface SatelliteModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationCode: string;
  stationName: string;
}

const SatelliteModal: React.FC<SatelliteModalProps> = ({
  isOpen,
  onClose,
  stationCode,
  stationName
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Checking for existing images...');

  useEffect(() => {
    if (!isOpen) return;

    const checkAndLoadImages = async () => {
      setLoading(true);
      setError(null);
      setImages([]);
      setStatusMessage('Checking for existing images...');

      try {
        // Step 1: Check if images already exist via the status API
        const statusResponse = await fetch(
          `${BACKEND_URL}/api/satellite/status/${stationCode}`
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();

          // If simulated frames already exist, show them
          if (statusData.exists && statusData.simulated_frames && statusData.simulated_frames.length > 0) {
            // Images are served via backend API - prepend BACKEND_URL to relative URLs
            setImages(statusData.simulated_frames.map((f: any) => `${BACKEND_URL}${f.url}`));
            setLoading(false);
            return;
          }
        }

        // Step 2: No existing images, call the backend to generate them
        setStatusMessage('Generating satellite imagery... This may take a moment.');

        const response = await fetch(`${BACKEND_URL}/api/satellite/simulate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            station_code: stationCode,
            year: 2023,
            simulate: true
          })
        });

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'error') {
          throw new Error(data.message);
        }

        // Step 3: Fetch the status again to get the newly generated image URLs
        setStatusMessage('Loading generated images...');

        const newStatusResponse = await fetch(
          `${BACKEND_URL}/api/satellite/status/${stationCode}`
        );

        if (newStatusResponse.ok) {
          const newStatusData = await newStatusResponse.json();

          // Get simulated frames URLs (images served via backend API)
          if (newStatusData.simulated_frames && newStatusData.simulated_frames.length > 0) {
            setImages(newStatusData.simulated_frames.map((f: any) => `${BACKEND_URL}${f.url}`));
          } else if (newStatusData.original_frames && newStatusData.original_frames.length > 0) {
            // Fallback to original if no simulated
            setImages(newStatusData.original_frames.map((f: any) => `${BACKEND_URL}${f.url}`));
          } else {
            throw new Error('No satellite images were generated');
          }
        } else {
          throw new Error('Failed to fetch generated images');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load satellite images');
      } finally {
        setLoading(false);
      }
    };

    checkAndLoadImages();
  }, [isOpen, stationCode]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            🛰️ Satellite Imagery - {stationName}
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        {loading && (
          <LoadingContainer>
            <Spinner />
            <LoadingText>{statusMessage}</LoadingText>
          </LoadingContainer>
        )}

        {error && (
          <ErrorMessage>
            <p style={{ margin: '0 0 10px 0', fontWeight: 600 }}>Error Loading Images</p>
            <p style={{ margin: 0 }}>{error}</p>
          </ErrorMessage>
        )}

        {!loading && !error && images.length > 0 && (
          <ImageCarousel images={images} title="Simulated Satellite Frames" />
        )}

        {!loading && !error && images.length === 0 && (
          <ErrorMessage style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', background: 'rgba(251, 191, 36, 0.1)' }}>
            <p style={{ margin: 0 }}>No satellite images available for this station yet.</p>
          </ErrorMessage>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

interface RowProps {
  name: string;
  value: string;
  deltaValue?: string | null;
  url?: string;
}

const Row: React.FC<RowProps> = ({ name, value, deltaValue, url }) => {
  if (!url && value && typeof value === 'string' && value.match(/^http/)) {
    url = value;
  }

  const asImg = /<img>/.test(name);
  return (
    <tr className="layer-hover-info__row" key={name}>
      <td className="row__name">{asImg ? name.replace('<img>', '') : name}</td>
      <td className="row__value">
        {asImg ? (
          <img src={value} />
        ) : url ? (
          <a target="_blank" rel="noopener noreferrer" href={url}>
            {value}
          </a>
        ) : (
          <>
            <span>{value}</span>
            {notNullorUndefined(deltaValue) ? (
              <span
                className={`row__delta-value ${deltaValue?.toString().charAt(0) === '+' ? 'positive' : 'negative'}`}
              >
                {deltaValue}
              </span>
            ) : null}
          </>
        )}
      </td>
    </tr>
  );
};

export type EntryInfoProps = Merge<LayerHoverProp, { fieldsToShow: TooltipField[] }>;

const EntryInfo: React.FC<EntryInfoProps> = ({ fieldsToShow, ...props }) => (
  <tbody>
    {fieldsToShow.map(item => (
      <EntryInfoRow key={item.name} item={item} {...props} />
    ))}
  </tbody>
);

export type EntryInfoRowProps = {
  data: LayerHoverProp['data'];
  fields: Field[];
  layer: Layer;
  primaryData?: LayerHoverProp['primaryData'];
  compareType?: CompareType;
  currentTime?: VisState['animationConfig']['currentTime'];
  item: TooltipField;
};

const EntryInfoRow: React.FC<EntryInfoRowProps> = ({
  layer,
  item,
  fields,
  data,
  primaryData,
  compareType,
  currentTime
}) => {
  const fieldIdx = fields.findIndex(f => f.name === item.name);
  if (fieldIdx < 0) {
    return null;
  }
  const field = fields[fieldIdx];
  const fieldValueAccessor = layer.accessVSFieldValue(field, currentTime);
  const value = fieldValueAccessor(field, data instanceof DataRow ? { index: data._rowIndex } : data);

  let primaryValue = null;
  let displayDeltaValue: string | null = null;

  if (primaryData) {
    try {
      if (
        primaryData instanceof DataRow ||
        (primaryData && typeof primaryData === 'object' && 'index' in primaryData)
      ) {
        primaryValue = fieldValueAccessor(
          field,
          primaryData instanceof DataRow ? { index: primaryData._rowIndex } : primaryData
        );

        displayDeltaValue = getTooltipDisplayDeltaValue({
          field,
          value,
          primaryValue,
          compareType
        });
      }
    } catch (error) {
      primaryValue = null;
    }
  }

  const displayValue = getTooltipDisplayValue({ item, field, value });

  return (
    <Row
      name={field.displayName || field.name}
      value={displayValue}
      deltaValue={displayDeltaValue}
    />
  );
};

const CellInfo = ({
  fieldsToShow,
  data,
  layer
}: {
  data: AggregationLayerHoverData;
  fieldsToShow: TooltipField[];
  layer: Layer;
}) => {
  const { colorField, sizeField } = layer.config as any;

  const colorValue = useMemo(() => {
    if (colorField && layer.visualChannels.color) {
      const item = fieldsToShow.find(field => field.name === colorField.name);
      return getTooltipDisplayValue({ item, field: colorField, value: data.colorValue });
    }
    return null;
  }, [fieldsToShow, colorField, layer, data.colorValue]);

  const elevationValue = useMemo(() => {
    if (sizeField && layer.visualChannels.size) {
      const item = fieldsToShow.find(field => field.name === sizeField.name);
      return getTooltipDisplayValue({ item, field: sizeField, value: data.elevationValue });
    }
    return null;
  }, [fieldsToShow, sizeField, layer, data.elevationValue]);

  const aggregatedData = useMemo(() => {
    if (data.aggregatedData && fieldsToShow) {
      return fieldsToShow.reduce((acc, field) => {
        const dataForField = data.aggregatedData?.[field.name];
        if (dataForField?.measure && field.name !== colorField?.name) {
          acc.push({
            name: `${capitalizeFirstLetter(dataForField.measure)} of ${field.name}`,
            value: dataForField.value
          });
        }
        return acc;
      }, [] as { name: string; value?: string }[]);
    }
    return [];
  }, [data.aggregatedData, fieldsToShow, colorField?.name]);

  const colorMeasure = layer.getVisualChannelDescription('color').measure;
  const sizeMeasure = layer.getVisualChannelDescription('size').measure;
  return (
    <tbody>
      <Row name={'total points'} key="count" value={String(data.points && data.points.length)} />
      {colorField && layer.visualChannels.color && colorMeasure ? (
        <Row name={colorMeasure} key="color" value={colorValue || 'N/A'} />
      ) : null}
      {sizeField && layer.visualChannels.size && sizeMeasure ? (
        <Row name={sizeMeasure} key="size" value={elevationValue || 'N/A'} />
      ) : null}
      {aggregatedData.map((dataForField, idx) => (
        <Row name={dataForField.name} key={`data_${idx}`} value={dataForField.value || 'N/A'} />
      ))}
    </tbody>
  );
};

const LayerHoverInfoFactory = () => {
  const LayerHoverInfo = props => {
    const { data, layer, fields } = props;
    const intl = useIntl();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStation, setSelectedStation] = useState<{ code: string; name: string } | null>(null);

    if (!data || !layer) {
      return null;
    }

    const hasFieldsToShow =
      (data.fieldValues && Object.keys(data.fieldValues).length > 0) ||
      (data.wmsFeatureData && data.wmsFeatureData.length > 0) ||
      (props.fieldsToShow && props.fieldsToShow.length > 0);

    // Check if this is a municipal_stations layer to show the satellite button
    const isMunicipalStation = layer.config?.dataId === 'municipal_stations';

    // Get station code for the button
    const stationInfo = useMemo(() => {
      if (!isMunicipalStation || !fields || !data) {
        return null;
      }

      const getFieldValue = (fieldName: string) => {
        const fieldIdx = fields.findIndex(f => f.name === fieldName);
        if (fieldIdx < 0) return null;
        if (data instanceof DataRow) {
          return data.valueAt(fieldIdx);
        } else if (Array.isArray(data)) {
          return data[fieldIdx];
        }
        return null;
      };

      const stnCode = getFieldValue('stn_code');
      const monitoringLocation = getFieldValue('monitoring_location');

      if (!stnCode) return null;

      return {
        code: String(stnCode),
        name: String(monitoringLocation || stnCode)
      };
    }, [isMunicipalStation, fields, data]);

    const handleOpenSatelliteModal = useCallback(() => {
      if (stationInfo) {
        setSelectedStation(stationInfo);
        setIsModalOpen(true);
      }
    }, [stationInfo]);

    const handleCloseModal = useCallback(() => {
      setIsModalOpen(false);
      setSelectedStation(null);
    }, []);

    return (
      <>
        <div className="map-popover__layer-info">
          <StyledLayerName className="map-popover__layer-name">
            <Layers height="12px" />
            {props.layer.config.label}
          </StyledLayerName>
          {hasFieldsToShow && <StyledDivider />}
          <StyledTable>
            {data.wmsFeatureData ? (
              <tbody>
                {data.wmsFeatureData.map(({ name, value }, i) => (
                  <Row key={i} name={name} value={value} />
                ))}
              </tbody>
            ) : data.fieldValues ? (
              <tbody>
                {data.fieldValues.map(({ labelMessage, value }, i) => (
                  <Row key={i} name={intl.formatMessage({ id: labelMessage })} value={value} />
                ))}
              </tbody>
            ) : props.layer.isAggregated ? (
              <CellInfo {...props} />
            ) : (
              <EntryInfo {...props} />
            )}
          </StyledTable>
          {hasFieldsToShow && <StyledDivider />}

          {/* Satellite Button for Municipal Stations */}
          {stationInfo && (
            <SatelliteButtonContainer>
              <SatelliteButton onClick={handleOpenSatelliteModal}>
                🛰️ View Satellite Imagery
              </SatelliteButton>
            </SatelliteButtonContainer>
          )}
        </div>

        {/* Satellite Modal */}
        {selectedStation && (
          <SatelliteModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            stationCode={selectedStation.code}
            stationName={selectedStation.name}
          />
        )}
      </>
    );
  };

  LayerHoverInfo.propTypes = {
    fields: PropTypes.arrayOf(PropTypes.any),
    fieldsToShow: PropTypes.arrayOf(PropTypes.any),
    layer: PropTypes.object,
    data: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.any), PropTypes.object])
  };
  return LayerHoverInfo;
};

export default LayerHoverInfoFactory;
