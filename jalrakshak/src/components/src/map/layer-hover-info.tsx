// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React, { useMemo, useState, useCallback } from 'react';
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
  // offset divider to reach popover edge
  margin-left: -14px;
  margin-right: -14px;
  border-bottom: 1px solid ${props => props.theme.panelBorderColor};
`;

// Satellite Analysis Button Styles
const SatelliteButtonContainer = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.panelBorderColor};
`;

const SatelliteButton = styled.button<{ $loading?: boolean }>`
  width: 100%;
  padding: 10px 16px;
  background: ${props => props.$loading
    ? props.theme.panelBackgroundHover
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: ${props => props.$loading ? 'wait' : 'pointer'};
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

const SatelliteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
    <path d="M2 12C2 6.5 6.5 2 12 2s10 4.5 10 10-4.5 10-10 10S2 17.5 2 12z" />
    <path d="M17.5 6.5L22 2M6.5 17.5L2 22M17.5 17.5L22 22M6.5 6.5L2 2" />
  </svg>
);

const SpinnerIcon = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SimulationResult = styled.div<{ $status: 'success' | 'error' }>`
  margin-top: 8px;
  padding: 8px 12px;
  background: ${props => props.$status === 'success'
    ? 'rgba(34, 197, 94, 0.1)'
    : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${props => props.$status === 'success'
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(239, 68, 68, 0.3)'};
  border-radius: 6px;
  color: ${props => props.$status === 'success' ? '#22c55e' : '#ef4444'};
  font-size: 11px;
`;

const SimulationImageGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
`;

const SimulationImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.panelBorderColor};
`;

const ImageLabel = styled.div<{ $variant: 'original' | 'simulated' }>`
  text-align: center;
  padding: 4px;
  font-size: 10px;
  font-weight: 600;
  color: ${props => props.$variant === 'original' ? '#22c55e' : '#f5576c'};
  text-transform: uppercase;
`;

interface RowProps {
  name: string;
  value: string;
  deltaValue?: string | null;
  url?: string;
}

const Row: React.FC<RowProps> = ({ name, value, deltaValue, url }) => {
  // Set 'url' to 'value' if it looks like a url
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
                className={`row__delta-value ${deltaValue?.toString().charAt(0) === '+' ? 'positive' : 'negative'
                  }`}
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

  // Handle WMS layer data in comparison mode - WMS layers don't have comparable field data
  let primaryValue = null;
  let displayDeltaValue: string | null = null;

  if (primaryData) {
    try {
      // Only calculate primary value if primaryData has a compatible structure
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
      // If there's an error accessing primaryData (e.g., WMS layer data), skip comparison
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

// TODO: supporting comparative value for aggregated cells as well
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

// Satellite Simulation Component for the tooltip
interface SatelliteSimulationButtonProps {
  suspectName: string;
  lat: number;
  lon: number;
}

const BACKEND_URL = 'http://localhost:8000';

const SatelliteSimulationButton: React.FC<SatelliteSimulationButtonProps> = ({
  suspectName,
  lat,
  lon
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: 'success' | 'error'; message: string; images?: { original?: string; simulated?: string } } | null>(null);

  const handleSimulate = useCallback(async () => {
    setLoading(true);
    setResult(null);

    try {
      // For now, we'll use a simplified approach - generate simulation based on coordinates
      // In a real implementation, this would call the backend with actual station codes
      const response = await fetch(`${BACKEND_URL}/api/satellite/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Use a nearby station code or coordinates
          // For demo, we'll use a station code that might be near this location
          station_code: '4085', // Example station code
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

      // Fetch the generated images
      const statusResponse = await fetch(
        `${BACKEND_URL}/api/satellite/status/${data.station_code}?base_url=${encodeURIComponent(BACKEND_URL)}`
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const firstOriginal = statusData.original_frames?.[0]?.url;
        const firstSimulated = statusData.simulated_frames?.[0]?.url;

        setResult({
          status: 'success',
          message: `Generated ${data.total_frames} satellite frames for analysis`,
          images: {
            original: firstOriginal,
            simulated: firstSimulated
          }
        });
      } else {
        setResult({
          status: 'success',
          message: data.message
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate satellite analysis'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SatelliteButtonContainer>
      <SatelliteButton onClick={handleSimulate} disabled={loading} $loading={loading}>
        {loading ? (
          <>
            <SpinnerIcon />
            Generating Analysis...
          </>
        ) : (
          <>
            <SatelliteIcon />
            🛰️ Generate Satellite Analysis
          </>
        )}
      </SatelliteButton>

      {result && (
        <>
          <SimulationResult $status={result.status}>
            {result.status === 'success' ? '✓' : '✗'} {result.message}
          </SimulationResult>

          {result.images && (result.images.original || result.images.simulated) && (
            <SimulationImageGrid>
              {result.images.original && (
                <div>
                  <ImageLabel $variant="original">Original</ImageLabel>
                  <SimulationImage src={result.images.original} alt="Original satellite view" />
                </div>
              )}
              {result.images.simulated && (
                <div>
                  <ImageLabel $variant="simulated">Simulated</ImageLabel>
                  <SimulationImage src={result.images.simulated} alt="Simulated pollution view" />
                </div>
              )}
            </SimulationImageGrid>
          )}
        </>
      )}
    </SatelliteButtonContainer>
  );
};

const LayerHoverInfoFactory = () => {
  const LayerHoverInfo = props => {
    const { data, layer, fields } = props;
    const intl = useIntl();
    if (!data || !layer) {
      return null;
    }

    const hasFieldsToShow =
      (data.fieldValues && Object.keys(data.fieldValues).length > 0) ||
      (data.wmsFeatureData && data.wmsFeatureData.length > 0) ||
      (props.fieldsToShow && props.fieldsToShow.length > 0);

    // Check if this layer has sentinel_images (works for suspect_links and municipal_stations)
    const sentinelImages = useMemo(() => {
      const dataId = layer.config?.dataId;
      // Check if this layer might have sentinel images
      const hasImages = dataId === 'suspect_links' || dataId === 'municipal_stations';
      if (!hasImages || !fields || !data) {
        return null;
      }

      // Find the sentinel_images field index
      const sentinelFieldIdx = fields.findIndex(f => f.name === 'sentinel_images');
      if (sentinelFieldIdx < 0) {
        return null;
      }

      // Get the value from data
      let imagesValue: string | string[] | null = null;
      if (data instanceof DataRow) {
        imagesValue = data.valueAt(sentinelFieldIdx);
      } else if (Array.isArray(data)) {
        imagesValue = data[sentinelFieldIdx];
      }

      if (!imagesValue) {
        return null;
      }

      // Parse JSON string if needed
      try {
        if (typeof imagesValue === 'string') {
          return JSON.parse(imagesValue) as string[];
        }
        return imagesValue as string[];
      } catch (e) {
        console.warn('Failed to parse sentinel_images:', e);
        return null;
      }
    }, [layer.config?.dataId, fields, data]);

    // Extract suspect info for satellite simulation button
    const suspectInfo = useMemo(() => {
      const dataId = layer.config?.dataId;
      if (dataId !== 'suspect_links' || !fields || !data) {
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

      const companyName = getFieldValue('company_name');
      const targetLat = getFieldValue('target_lat');
      const targetLon = getFieldValue('target_lon');

      if (!companyName || targetLat == null || targetLon == null) {
        return null;
      }

      return {
        name: String(companyName),
        lat: Number(targetLat),
        lon: Number(targetLon)
      };
    }, [layer.config?.dataId, fields, data]);

    return (
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
        {sentinelImages && sentinelImages.length > 0 && (
          <ImageCarousel images={sentinelImages} title="Sentinel Satellite Images" />
        )}
        {suspectInfo && (
          <SatelliteSimulationButton
            suspectName={suspectInfo.name}
            lat={suspectInfo.lat}
            lon={suspectInfo.lon}
          />
        )}
      </div>
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

