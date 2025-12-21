/**
 * Inspector Panel - Main Component
 * The primary interface for the Municipal Inspector workflow
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { AlertCard } from './components/alert-card';
import { SourceTracePanel } from './components/source-trace-panel';
import { ClassificationResultComponent } from './components/classification-result';
import { FactoryInfoCard } from './components/factory-info-card';
import { PollutionForecastSection } from './components/pollution-forecast-section';
import { useInspectorApi } from './hooks/use-inspector-api';
import { usePushNotifications } from './hooks/use-push-notifications';
import { useTraceContext } from './context/trace-context';
import type {
  InspectorAlert,
  ForecastAlert,
  ForecastSeverity,
  WaterQualityParameters,
  FineGenerationRequest,
} from './types/inspector.types';
import { SEVERITY_COLORS } from './constants/pollution-categories';

const Panel = styled.div<{ width: number; collapsed: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: ${props => (props.collapsed ? '52px' : `${props.width}px`)};
  max-width: 90vw;
  background: #1a1a2e;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 30;
  transition: width 0.2s ease;
`;

const ResizeHandle = styled.div<{ collapsed: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  opacity: ${props => (props.collapsed ? 0 : 0.5)};
  background: transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    opacity: 1;
  }
`;

const Header = styled.div`
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Badge = styled.span`
  background: #F44336;
  color: white;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  height: 28px;
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const NotificationButton = styled.button<{ isSubscribed: boolean }>`
  background: ${props => props.isSubscribed ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)'};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  min-height: 28px;
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    opacity: 0.9;
  }
`;

const CollapsedBody = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-direction: column;
`;

const CollapsedLabel = styled.div`
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 2px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
`;

const Section = styled.div`
  margin-bottom: 12px;

  &:empty {
    display: none;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
`;

const SubsectionToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 12px;
`;

const ToggleButton = styled.button<{ isActive: boolean }>`
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  cursor: pointer;
  color: ${props => (props.isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)')};
  background: ${props => (props.isActive ? 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' : 'transparent')};
  box-shadow: ${props => (props.isActive ? '0 8px 16px rgba(0, 0, 0, 0.2)' : 'none')};

  &:hover {
    color: #fff;
  }
`;

const FiltersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 140px;
`;

const FilterLabel = styled.label`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FilterValue = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
`;

const FilterRange = styled.input`
  width: 100%;
  accent-color: #2196F3;
`;

const FilterSelect = styled.select`
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

const FilterHint = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
`;

const RefreshButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const AlertsList = styled.div`
  max-height: 200px;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 16px;
  color: rgba(255, 255, 255, 0.5);
`;

const GenerateDemoButton = styled.button`
  background: rgba(156, 39, 176, 0.2);
  border: 1px solid #9C27B0;
  color: #CE93D8;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;

  &:hover {
    background: rgba(156, 39, 176, 0.3);
  }
`;

const SelectedAlert = styled.div<{ severity: string }>`
  background: ${props => SEVERITY_COLORS[props.severity as keyof typeof SEVERITY_COLORS]}20;
  border: 1px solid ${props => SEVERITY_COLORS[props.severity as keyof typeof SEVERITY_COLORS]};
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
`;

const SelectedAlertHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SelectedAlertTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #fff;
`;

const SelectedAlertMeta = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          color: white;
        `;
      case 'danger':
        return `
          background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
          color: white;
        `;
      default:
        return `
          background: rgba(255, 255, 255, 0.1);
          color: white;
        `;
    }
  }}

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Workflow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
`;

const WorkflowStep = styled.div<{ status: 'pending' | 'active' | 'done' }>`
  border-radius: 8px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  gap: 6px;

  ${props => {
    switch (props.status) {
      case 'done':
        return `
          border-color: rgba(76, 175, 80, 0.6);
          background: rgba(76, 175, 80, 0.08);
        `;
      case 'active':
        return `
          border-color: rgba(33, 150, 243, 0.6);
          background: rgba(33, 150, 243, 0.08);
        `;
      default:
        return '';
    }
  }}
`;

const StepHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
`;

const StepMeta = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
`;

const StepBadge = styled.span<{ status: 'pending' | 'active' | 'done' }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: ${props => (props.status === 'done' ? '#C8E6C9' : 'rgba(255, 255, 255, 0.7)')};
  background: ${props => (props.status === 'done' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.08)')};
`;

const GenerateFineModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #1a1a2e;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h3`
  margin: 0 0 16px 0;
  color: #fff;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #2196F3;
  }
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 560;
const EMPTY_PARAMETERS: WaterQualityParameters = {};
const FORECAST_SEVERITY_TO_ALERT: Record<ForecastSeverity, keyof typeof SEVERITY_COLORS> = {
  SAFE: 'low',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

interface InspectorPanelProps {
  onClose?: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ onClose }) => {
  const [selectedAlert, setSelectedAlert] = useState<InspectorAlert | null>(null);
  const [selectedForecast, setSelectedForecast] = useState<ForecastAlert | null>(null);
  const [showFineModal, setShowFineModal] = useState(false);
  const [inspectorName, setInspectorName] = useState('Officer Rahul');
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<'alerts' | 'forecast'>('alerts');
  const [minSeverity, setMinSeverity] = useState(0.5);
  const [alertLimit, setAlertLimit] = useState(20);
  const resizeStateRef = useRef({ isResizing: false, startX: 0, startWidth: DEFAULT_PANEL_WIDTH });

  const {
    alerts,
    trace,
    classification,
    fine,
    forecast,
    fetchAlerts,
    generateDemoAlerts,
    traceSource,
    classifyPollution,
    generateFine,
    downloadFinePdf,
    fetchForecast,
    clearTraceState,
    clearClassificationState,
    clearFineState,
  } = useInspectorApi();

  const {
    isSubscribed,
    subscribe,
    unsubscribe,
    isSupported,
    loading: pushLoading,
  } = usePushNotifications();

  // Use trace context for map visualization
  const {
    setTrace: setTraceInContext,
    selectedFactory,
    setSelectedFactory,
    clearTrace,
  } = useTraceContext();

  // Load alerts on mount and when filters change
  useEffect(() => {
    fetchAlerts({ min_severity: minSeverity, limit: alertLimit });
  }, [fetchAlerts, minSeverity, alertLimit]);

  // Sync trace data to context for map visualization
  useEffect(() => {
    if (trace.data) {
      setTraceInContext(trace.data);
    }
  }, [trace.data, setTraceInContext]);

  // Clear trace when panel closes
  useEffect(() => {
    return () => {
      clearTrace();
    };
  }, [clearTrace]);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (!resizeStateRef.current.isResizing) return;
    const delta = event.clientX - resizeStateRef.current.startX;
    const nextWidth = clamp(
      resizeStateRef.current.startWidth + delta,
      MIN_PANEL_WIDTH,
      MAX_PANEL_WIDTH
    );
    setPanelWidth(nextWidth);
  }, []);

  const handleResizeEnd = useCallback(() => {
    if (!resizeStateRef.current.isResizing) return;
    resizeStateRef.current.isResizing = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    if (isCollapsed) return;
    event.preventDefault();
    resizeStateRef.current = {
      isResizing: true,
      startX: event.clientX,
      startWidth: panelWidth,
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }, [handleResizeEnd, handleResizeMove, isCollapsed, panelWidth]);

  useEffect(() => () => handleResizeEnd(), [handleResizeEnd]);

  const handleRefresh = useCallback(() => {
    fetchAlerts({ min_severity: minSeverity, limit: alertLimit });
  }, [fetchAlerts, minSeverity, alertLimit]);

  const handleToggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const resetWorkflow = useCallback(() => {
    setSelectedFactory(null);
    clearTrace();
    clearTraceState();
    clearClassificationState();
    clearFineState();
    setShowFineModal(false);
  }, [clearClassificationState, clearFineState, clearTrace, clearTraceState, setSelectedFactory]);

  const handleSectionSwitch = useCallback((section: 'alerts' | 'forecast') => {
    if (section === activeSection) return;
    setActiveSection(section);
    setSelectedAlert(null);
    setSelectedForecast(null);
    resetWorkflow();
  }, [activeSection, resetWorkflow]);

  const handleAlertSelect = useCallback((alert: InspectorAlert) => {
    setSelectedAlert(alert);
    setSelectedForecast(null);
    resetWorkflow();
  }, [resetWorkflow]);

  const handleForecastSelect = useCallback((forecastItem: ForecastAlert) => {
    setSelectedForecast(forecastItem);
    setSelectedAlert(null);
    resetWorkflow();
  }, [resetWorkflow]);

  const handleFindSource = useCallback(async () => {
    if (!selectedAlert) return;
    await traceSource(selectedAlert.station_code);
  }, [selectedAlert, traceSource]);

  const handleClassify = useCallback(async () => {
    if (!selectedAlert || !trace.data) return;
    await classifyPollution(
      selectedAlert.parameters,
      selectedAlert.station_code,
      `Alert: ${selectedAlert.anomaly_type}`
    );
  }, [selectedAlert, trace.data, classifyPollution]);

  const handleForecastTrace = useCallback(async () => {
    if (!selectedForecast) return;
    await traceSource(selectedForecast.station_code);
  }, [selectedForecast, traceSource]);

  const handleForecastClassify = useCallback(async () => {
    if (!selectedForecast || !trace.data) return;
    await classifyPollution(
      EMPTY_PARAMETERS,
      selectedForecast.station_code,
      `Forecast: ${selectedForecast.alert_message}`
    );
  }, [selectedForecast, trace.data, classifyPollution]);

  const handleGenerateFine = useCallback(async () => {
    if (!selectedAlert || !selectedFactory || !classification.data) return;

    const request: FineGenerationRequest = {
      factory_id: selectedFactory.license_id,
      alert_id: selectedAlert.id,
      violation_type: classification.data.pollution_type,
      fine_amount: classification.data.base_fine,
      inspector_name: inspectorName,
      inspector_designation: 'Municipal Inspector',
    };

    const result = await generateFine(request);
    if (result) {
      setShowFineModal(false);
      // Download the PDF
      await downloadFinePdf(result.fine_id);
    }
  }, [selectedAlert, selectedFactory, classification.data, inspectorName, generateFine, downloadFinePdf]);

  const handlePushToggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  const newAlertsCount = alerts.data?.filter(a => a.status === 'new').length || 0;
  const selectedForecastSeverity = selectedForecast
    ? FORECAST_SEVERITY_TO_ALERT[selectedForecast.predicted_severity]
    : 'low';
  const selectedForecastLocation = selectedForecast
    ? [
        selectedForecast.location && selectedForecast.location.toLowerCase() !== 'unknown'
          ? selectedForecast.location
          : '',
        selectedForecast.river_cluster && selectedForecast.river_cluster !== 'UNKNOWN'
          ? selectedForecast.river_cluster
          : '',
      ].filter(Boolean).join(' | ')
    : '';

  return (
    <Panel width={panelWidth} collapsed={isCollapsed}>
      <ResizeHandle collapsed={isCollapsed} onMouseDown={handleResizeStart} />
      <Header>
        {!isCollapsed && (
          <Title>
            Inspector Mode
            {newAlertsCount > 0 && <Badge>{newAlertsCount} new</Badge>}
          </Title>
        )}
        <HeaderActions>
          {!isCollapsed && isSupported && (
            <NotificationButton
              isSubscribed={isSubscribed}
              onClick={handlePushToggle}
              disabled={pushLoading}
            >
              {isSubscribed ? 'Notifications On' : 'Enable Notifications'}
            </NotificationButton>
          )}
          <IconButton
            onClick={handleToggleCollapsed}
            title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isCollapsed ? '>' : '<'}
          </IconButton>
          {onClose && (
            <IconButton onClick={onClose} title="Close inspector panel" aria-label="Close panel">
              x
            </IconButton>
          )}
        </HeaderActions>
      </Header>

      {isCollapsed ? (
        <CollapsedBody>
          {newAlertsCount > 0 && <Badge>{newAlertsCount}</Badge>}
          <CollapsedLabel>Inspector</CollapsedLabel>
        </CollapsedBody>
      ) : (
        <Content>
          <SubsectionToggle>
            <ToggleButton
              type="button"
              isActive={activeSection === 'alerts'}
              onClick={() => handleSectionSwitch('alerts')}
              aria-pressed={activeSection === 'alerts'}
            >
              Alerts
            </ToggleButton>
            <ToggleButton
              type="button"
              isActive={activeSection === 'forecast'}
              onClick={() => handleSectionSwitch('forecast')}
              aria-pressed={activeSection === 'forecast'}
            >
              Forecast
            </ToggleButton>
          </SubsectionToggle>

          {activeSection === 'alerts' ? (
            <>
              <Section>
                <SectionHeader>
                  <SectionTitle>Active Alerts</SectionTitle>
                  <RefreshButton onClick={handleRefresh}>
                    Refresh
                  </RefreshButton>
                </SectionHeader>
                <FiltersRow>
                  <FilterGroup>
                    <FilterLabel>Min severity</FilterLabel>
                    <FilterValue>
                      <span>{(minSeverity * 100).toFixed(0)}%</span>
                      <span>0 - 100</span>
                    </FilterValue>
                    <FilterRange
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={minSeverity}
                      onChange={event => setMinSeverity(parseFloat(event.target.value))}
                    />
                  </FilterGroup>
                  <FilterGroup>
                    <FilterLabel>Max results</FilterLabel>
                    <FilterSelect
                      value={alertLimit}
                      onChange={event => setAlertLimit(parseInt(event.target.value, 10))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </FilterSelect>
                  </FilterGroup>
                </FiltersRow>
                <FilterHint>
                  Alerts are generated from CPCB threshold violations. Adjust severity and limit to tune volume.
                </FilterHint>

                {alerts.loading ? (
                  <EmptyState>Loading alerts...</EmptyState>
                ) : alerts.data && alerts.data.length > 0 ? (
                  <AlertsList>
                    {alerts.data.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        isSelected={selectedAlert?.id === alert.id}
                        onClick={handleAlertSelect}
                      />
                    ))}
                  </AlertsList>
                ) : (
                  <EmptyState>
                    No active alerts
                    <br />
                    <GenerateDemoButton onClick={() => generateDemoAlerts({ min_severity: minSeverity, limit: alertLimit })}>
                      Generate Demo Alerts
                    </GenerateDemoButton>
                  </EmptyState>
                )}
              </Section>

              {selectedAlert && (
                <Section>
                  <SelectedAlert severity={selectedAlert.severity}>
                    <SelectedAlertHeader>
                      <SelectedAlertTitle>{selectedAlert.anomaly_type}</SelectedAlertTitle>
                    </SelectedAlertHeader>
                    <SelectedAlertMeta>
                      <div>Station: {selectedAlert.station_code} | {selectedAlert.station_name}</div>
                    </SelectedAlertMeta>
                  </SelectedAlert>
                  <Workflow>
                    <WorkflowStep status={trace.loading ? 'active' : trace.data ? 'done' : 'pending'}>
                      <StepHeader>
                        <span>1. Trace Source</span>
                        <StepBadge status={trace.loading ? 'active' : trace.data ? 'done' : 'pending'}>
                          {trace.loading ? 'running' : trace.data ? 'done' : 'pending'}
                        </StepBadge>
                      </StepHeader>
                      <StepMeta>Trace upstream stations and potential polluters.</StepMeta>
                      <ActionButton
                        variant="primary"
                        onClick={handleFindSource}
                        disabled={trace.loading}
                      >
                        {trace.loading ? 'Tracing...' : trace.data ? 'Re-Trace Source' : 'Trace Source'}
                      </ActionButton>
                    </WorkflowStep>
                    <WorkflowStep
                      status={classification.loading ? 'active' : classification.data ? 'done' : 'pending'}
                    >
                      <StepHeader>
                        <span>2. Classify Pollution</span>
                        <StepBadge
                          status={classification.loading ? 'active' : classification.data ? 'done' : 'pending'}
                        >
                          {classification.loading ? 'running' : classification.data ? 'done' : 'pending'}
                        </StepBadge>
                      </StepHeader>
                      <StepMeta>Analyze water parameters to identify pollution type.</StepMeta>
                      <ActionButton
                        onClick={handleClassify}
                        disabled={classification.loading || !trace.data}
                      >
                        {classification.loading ? 'Classifying...' : classification.data ? 'Re-Classify' : 'Classify'}
                      </ActionButton>
                    </WorkflowStep>
                  </Workflow>
                </Section>
              )}

              <Section>
                <SourceTracePanel
                  trace={trace.data}
                  loading={trace.loading}
                  selectedFactory={selectedFactory}
                  onSelectFactory={setSelectedFactory}
                  hasSelection={!!selectedAlert}
                />
              </Section>

              {classification.data && (
                <Section>
                  <ClassificationResultComponent result={classification.data} />
                </Section>
              )}

              {selectedFactory && (
                <Section>
                  <SectionTitle style={{ marginBottom: '12px' }}>Selected Factory</SectionTitle>
                  <FactoryInfoCard
                    factory={selectedFactory}
                    isSelected
                    showDetails
                  />
                  {classification.data && (
                    <ActionButton
                      variant="danger"
                      onClick={() => setShowFineModal(true)}
                      style={{ width: '100%', marginTop: '12px' }}
                    >
                      Generate Fine
                    </ActionButton>
                  )}
                </Section>
              )}
            </>
          ) : (
            <>
              <PollutionForecastSection
                forecast={forecast}
                onFetchForecast={fetchForecast}
                selectedForecastId={selectedForecast?.id ?? null}
                onSelectForecast={handleForecastSelect}
              />

              {selectedForecast && (
                <Section>
                  <SelectedAlert severity={selectedForecastSeverity}>
                    <SelectedAlertHeader>
                      <SelectedAlertTitle>{selectedForecast.alert_message}</SelectedAlertTitle>
                    </SelectedAlertHeader>
                    <SelectedAlertMeta>
                      <div>Station: {selectedForecast.station_code} | {selectedForecast.station_name}</div>
                      {selectedForecastLocation && <div>{selectedForecastLocation}</div>}
                      <div>Severity: {selectedForecast.predicted_severity}</div>
                      <div>
                        Horizon: {selectedForecast.forecast_horizon_months} months | Confidence: {Math.round(selectedForecast.confidence * 100)}%
                      </div>
                    </SelectedAlertMeta>
                  </SelectedAlert>
                  <Workflow>
                    <WorkflowStep status={trace.loading ? 'active' : trace.data ? 'done' : 'pending'}>
                      <StepHeader>
                        <span>1. Trace Source</span>
                        <StepBadge status={trace.loading ? 'active' : trace.data ? 'done' : 'pending'}>
                          {trace.loading ? 'running' : trace.data ? 'done' : 'pending'}
                        </StepBadge>
                      </StepHeader>
                      <StepMeta>Trace upstream stations and potential polluters.</StepMeta>
                      <ActionButton
                        variant="primary"
                        onClick={handleForecastTrace}
                        disabled={trace.loading}
                      >
                        {trace.loading ? 'Tracing...' : trace.data ? 'Re-Trace Source' : 'Trace Source'}
                      </ActionButton>
                    </WorkflowStep>
                    <WorkflowStep
                      status={classification.loading ? 'active' : classification.data ? 'done' : 'pending'}
                    >
                      <StepHeader>
                        <span>2. Predict Pollutants</span>
                        <StepBadge
                          status={classification.loading ? 'active' : classification.data ? 'done' : 'pending'}
                        >
                          {classification.loading ? 'running' : classification.data ? 'done' : 'pending'}
                        </StepBadge>
                      </StepHeader>
                      <StepMeta>Analyze predicted conditions to identify likely pollutant class.</StepMeta>
                      <ActionButton
                        onClick={handleForecastClassify}
                        disabled={classification.loading || !trace.data}
                      >
                        {classification.loading ? 'Predicting...' : classification.data ? 'Re-Predict' : 'Predict Pollutants'}
                      </ActionButton>
                    </WorkflowStep>
                  </Workflow>
                </Section>
              )}

              <Section>
                <SourceTracePanel
                  trace={trace.data}
                  loading={trace.loading}
                  selectedFactory={selectedFactory}
                  onSelectFactory={setSelectedFactory}
                  hasSelection={!!selectedForecast}
                />
              </Section>

              {classification.data && (
                <Section>
                  <ClassificationResultComponent result={classification.data} />
                </Section>
              )}

              {selectedFactory && (
                <Section>
                  <SectionTitle style={{ marginBottom: '12px' }}>Selected Factory</SectionTitle>
                  <FactoryInfoCard
                    factory={selectedFactory}
                    isSelected
                    showDetails
                  />
                </Section>
              )}
            </>
          )}
        </Content>
      )}

      {/* Fine Generation Modal */}
      {showFineModal && (
        <GenerateFineModal onClick={() => setShowFineModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalTitle>Generate Violation Notice</ModalTitle>

            <FormGroup>
              <Label>Factory</Label>
              <Input value={selectedFactory?.company_name || ''} disabled />
            </FormGroup>

            <FormGroup>
              <Label>Violation Type</Label>
              <Input value={classification.data?.pollution_type || ''} disabled />
            </FormGroup>

            <FormGroup>
              <Label>Fine Amount</Label>
              <Input
                value={`Rs. ${(classification.data?.base_fine || 0).toLocaleString()}`}
                disabled
              />
            </FormGroup>

            <FormGroup>
              <Label>Inspector Name</Label>
              <Input
                value={inspectorName}
                onChange={e => setInspectorName(e.target.value)}
              />
            </FormGroup>

            <ModalButtons>
              <ActionButton onClick={() => setShowFineModal(false)}>
                Cancel
              </ActionButton>
              <ActionButton
                variant="danger"
                onClick={handleGenerateFine}
                disabled={fine.loading}
              >
                {fine.loading ? 'Generating...' : 'Generate & Download PDF'}
              </ActionButton>
            </ModalButtons>
          </ModalContent>
        </GenerateFineModal>
      )}
    </Panel>
  );
};

export default InspectorPanel;
