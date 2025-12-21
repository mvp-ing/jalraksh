/**
 * Inspector Mode Module
 *
 * Provides components and hooks for the Municipal Inspector workflow:
 * - Alert management
 * - Source tracing
 * - Pollution classification (Gemini AI)
 * - Factory/permit lookup
 * - Fine generation
 * - Push notifications
 */

// Main panel
export { InspectorPanel } from './inspector-panel';
export { default } from './inspector-panel';

// Components
export { AlertCard } from './components/alert-card';
export { ClassificationResultComponent } from './components/classification-result';
export { FactoryInfoCard } from './components/factory-info-card';
export { SourceTracePanel } from './components/source-trace-panel';
export { SourceTraceOverlay } from './components/source-trace-overlay';

// Hooks
export { useInspectorApi } from './hooks/use-inspector-api';
export { usePushNotifications } from './hooks/use-push-notifications';
export { useTraceAnimation } from './hooks/use-trace-animation';

// Layers
export { useSourceTraceLayers, getTraceViewport } from './layers/source-trace-layer';

// Context
export { TraceProvider, useTraceContext } from './context/trace-context';

// Types
export type {
  InspectorAlert,
  AlertSeverity,
  AlertStatus,
  WaterQualityParameters,
  TraceNode,
  FactorySuspect,
  SourceTraceResponse,
  ClassificationResult,
  FactoryDetails,
  PermitStatus,
  FineGenerationRequest,
  FineGenerationResponse,
  InspectorState,
  PathSegment,
  FactoryMarker,
} from './types/inspector.types';

// Constants
export {
  POLLUTION_CATEGORIES,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  STATUS_COLORS,
  PERMIT_STATUS_COLORS,
  WATER_QUALITY_THRESHOLDS,
} from './constants/pollution-categories';

// API Configuration
export { INSPECTOR_API_BASE_URL } from './constants/api-config';
