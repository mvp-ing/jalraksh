/**
 * TypeScript types for Inspector Mode
 */

// Alert severity levels
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// Alert status
export type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved';

// Permit status
export type PermitStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

// Water quality parameters
export interface WaterQualityParameters {
  temperature?: number;
  dissolved_oxygen?: number;
  ph?: number;
  conductivity?: number;
  bod?: number;
  nitrate_n?: number;
  fecal_coliform?: number;
  total_coliform?: number;
}

// Inspector alert
export interface InspectorAlert {
  id: string;
  station_code: string;
  station_name: string;
  location: string;
  river_cluster: string;
  coordinates: [number, number]; // [lat, lon]
  severity: AlertSeverity;
  anomaly_type: string;
  parameters: WaterQualityParameters;
  severity_score: number;
  timestamp: string;
  status: AlertStatus;
}

// Trace node in source tracing path
export interface TraceNode {
  station_code: string;
  station_name: string;
  location: string;
  coordinates: [number, number];
  depth: number;
  distance_km: number;
}

// Factory suspect
export interface FactorySuspect {
  license_id: string;
  company_name: string;
  industry_type: string;
  coordinates: [number, number];
  distance_from_station_km: number;
  permit_status: PermitStatus;
  suspicion_score: number;
  valid_upto?: string;
  historical_violations: number;
}

// Path segment for map visualization
export interface PathSegment {
  from_station: string;
  to_station: string;
  coordinates: [number, number][]; // List of [lon, lat] points
  distance_km: number;
  timestamp: number;
}

// Factory marker for map
export interface FactoryMarker {
  id: string;
  name: string;
  coordinates: [number, number]; // [lon, lat]
  suspicion_score: number;
  permit_status: string;
  industry_type: string;
}

// Source trace response
export interface SourceTraceResponse {
  source_station: string;
  path: TraceNode[];
  suspected_factories: FactorySuspect[];
  river_cluster: string;
  total_distance_km: number;
  // Map visualization data
  path_geometry: [number, number][]; // Full path as [lon, lat] points
  path_segments: PathSegment[]; // Segmented path for animation
  factory_markers: FactoryMarker[]; // Factory locations with suspicion data
}

// Classification result
export interface ClassificationResult {
  pollution_type: string;
  pollution_category: string;
  confidence: number;
  reasoning: string;
  ruled_out: Array<{ type: string; reason: string }>;
  key_indicators: string[];
  recommended_action: string;
  act_section: string;
  base_fine: number;
}

// Factory details
export interface AuthorizedLimits {
  max_discharge_kld: number;
  primary_pollutant: string;
}

export interface ComplianceHistory {
  last_inspection?: string;
  bank_guarantee?: number;
  violations_count: number;
}

export interface FactoryDetails {
  license_id: string;
  company_name: string;
  industry_type: string;
  status: PermitStatus;
  valid_upto: string;
  authorized_limits: AuthorizedLimits;
  coordinates: [number, number];
  location_hint: string;
  compliance_history: ComplianceHistory;
  distance_from_station_km?: number;
}

// Fine generation
export interface FineGenerationRequest {
  factory_id: string;
  alert_id: string;
  violation_type: string;
  violation_details?: string;
  fine_amount?: number;
  inspector_name: string;
  inspector_designation?: string;
}

export interface FineGenerationResponse {
  fine_id: string;
  pdf_url: string;
  fine_amount: number;
  factory_name: string;
  violation_type: string;
  generated_at: string;
}

// Inspector state
export interface InspectorState {
  isActive: boolean;
  alerts: InspectorAlert[];
  selectedAlert: InspectorAlert | null;
  sourceTrace: SourceTraceResponse | null;
  classification: ClassificationResult | null;
  factoryDetails: FactoryDetails | null;
  selectedFactory: FactorySuspect | null;
  fineGeneration: {
    isGenerating: boolean;
    generatedFine: FineGenerationResponse | null;
    error: string | null;
  };
  loading: {
    alerts: boolean;
    trace: boolean;
    classification: boolean;
    factory: boolean;
  };
  error: string | null;
}

// API configuration
export interface InspectorApiConfig {
  baseUrl: string;
  timeout?: number;
}

// Forecast types (STGNN-based predictions)
export type ForecastSeverity = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ForecastAlert {
  id: string;
  station_id: number;
  station_code: string;
  station_name: string;
  location: string;
  river_cluster: string;
  coordinates: [number, number]; // [lat, lon]

  // Forecast fields
  forecast_horizon_months: number; // 1, 2, or 3
  predicted_severity: ForecastSeverity;
  severity_index: number; // 0=SAFE, 4=CRITICAL
  confidence: number;
  probabilities: Record<ForecastSeverity, number>;
  alert_message: string;

  // Metadata
  model_timestamp: string;
  data_timestamp?: string;
}

export interface ForecastRequestParams {
  num_stations?: number;
  horizons?: number[];
  min_severity?: ForecastSeverity;
}

export interface ForecastResponse {
  forecasts: ForecastAlert[];
  total_stations_analyzed: number;
  critical_count: number;
  horizons_analyzed: number[];
  model_info: {
    checkpoint: string;
    epoch: number;
    val_loss: number;
    num_stations: number;
    severity_classes: string[];
  };
  generated_at: string;
}
