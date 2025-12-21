/**
 * Hook for Inspector Mode API calls
 */

import { useState, useCallback } from 'react';
import type {
  InspectorAlert,
  SourceTraceResponse,
  ClassificationResult,
  FactoryDetails,
  FactorySuspect,
  FineGenerationRequest,
  FineGenerationResponse,
  WaterQualityParameters,
  ForecastResponse,
  ForecastRequestParams,
} from '../types/inspector.types';
import { INSPECTOR_API_BASE_URL } from '../constants/api-config';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useInspectorApi() {
  const [alertsState, setAlertsState] = useState<ApiState<InspectorAlert[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const [traceState, setTraceState] = useState<ApiState<SourceTraceResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const [classificationState, setClassificationState] = useState<ApiState<ClassificationResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const [factoryState, setFactoryState] = useState<ApiState<FactoryDetails>>({
    data: null,
    loading: false,
    error: null,
  });

  const [fineState, setFineState] = useState<ApiState<FineGenerationResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const [forecastState, setForecastState] = useState<ApiState<ForecastResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  // Fetch alerts
  const fetchAlerts = useCallback(async (filters?: {
    status?: string;
    severity?: string;
    river_cluster?: string;
    min_severity?: number;
    limit?: number;
  }) => {
    setAlertsState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.river_cluster) params.append('river_cluster', filters.river_cluster);
      if (typeof filters?.min_severity === 'number') {
        params.append('min_severity', filters.min_severity.toString());
      }
      if (typeof filters?.limit === 'number') {
        params.append('limit', filters.limit.toString());
      }

      const response = await fetch(`${INSPECTOR_API_BASE_URL}/alerts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlertsState({ data: data.alerts, loading: false, error: null });
      return data.alerts;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setAlertsState(prev => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  // Generate demo alerts
  const generateDemoAlerts = useCallback(async (filters?: {
    status?: string;
    severity?: string;
    river_cluster?: string;
    min_severity?: number;
    limit?: number;
  }) => {
    try {
      const response = await fetch(`${INSPECTOR_API_BASE_URL}/alerts/demo/generate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to generate demo alerts');

      const data = await response.json();
      await fetchAlerts(filters);
      return data.alerts;
    } catch (error) {
      console.error('Failed to generate demo alerts:', error);
      return null;
    }
  }, [fetchAlerts]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (alertId: string, notes?: string) => {
    try {
      const response = await fetch(`${INSPECTOR_API_BASE_URL}/alerts/${alertId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to acknowledge alert');

      return await response.json();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return null;
    }
  }, []);

  // Trace pollution source
  const traceSource = useCallback(async (stationCode: string, options?: {
    river_cluster?: string;
    max_hops?: number;
    radius_km?: number;
  }) => {
    setTraceState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${INSPECTOR_API_BASE_URL}/source/trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_code: stationCode,
          ...options,
        }),
      });
      if (!response.ok) throw new Error('Failed to trace source');

      const data = await response.json();
      setTraceState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setTraceState(prev => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  // Classify pollution
  const classifyPollution = useCallback(async (
    parameters: WaterQualityParameters,
    stationCode?: string,
    context?: string
  ) => {
    setClassificationState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${INSPECTOR_API_BASE_URL}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameters,
          station_code: stationCode,
          context,
        }),
      });
      if (!response.ok) throw new Error('Failed to classify pollution');

      const data = await response.json();
      setClassificationState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setClassificationState(prev => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  // Get factory details
  const getFactoryDetails = useCallback(async (licenseId: string) => {
    setFactoryState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${INSPECTOR_API_BASE_URL}/factory/${encodeURIComponent(licenseId)}`);
      if (!response.ok) throw new Error('Failed to get factory details');

      const data = await response.json();
      setFactoryState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFactoryState(prev => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  // Get nearby factories
  const getNearbyFactories = useCallback(async (lat: number, lon: number, radiusKm = 10) => {
    try {
      const response = await fetch(
        `${INSPECTOR_API_BASE_URL}/factory/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
      );
      if (!response.ok) throw new Error('Failed to get nearby factories');

      const data = await response.json();
      return data.factories as FactoryDetails[];
    } catch (error) {
      console.error('Failed to get nearby factories:', error);
      return [];
    }
  }, []);

  // Generate fine
  const generateFine = useCallback(async (request: FineGenerationRequest) => {
    setFineState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${INSPECTOR_API_BASE_URL}/fine/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('Failed to generate fine');

      const data = await response.json();
      setFineState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFineState(prev => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  // Download fine PDF
  const downloadFinePdf = useCallback(async (fineId: string) => {
    try {
      const response = await fetch(`${INSPECTOR_API_BASE_URL}/fine/${fineId}/download`);
      if (!response.ok) throw new Error('Failed to download PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `violation_notice_${fineId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      return true;
    } catch (error) {
      console.error('Failed to download PDF:', error);
      return false;
    }
  }, []);

  const clearTraceState = useCallback(() => {
    setTraceState({ data: null, loading: false, error: null });
  }, []);

  const clearClassificationState = useCallback(() => {
    setClassificationState({ data: null, loading: false, error: null });
  }, []);

  const clearFineState = useCallback(() => {
    setFineState({ data: null, loading: false, error: null });
  }, []);

  // Fetch pollution forecast
  const fetchForecast = useCallback(async (params?: ForecastRequestParams) => {
    setForecastState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${INSPECTOR_API_BASE_URL}/forecast/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_stations: params?.num_stations ?? 15,
          horizons: params?.horizons ?? [1, 2, 3],
          min_severity: params?.min_severity ?? 'CRITICAL',
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch forecast');

      const data = await response.json();
      setForecastState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setForecastState(prev => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  const clearForecastState = useCallback(() => {
    setForecastState({ data: null, loading: false, error: null });
  }, []);

  return {
    // State
    alerts: alertsState,
    trace: traceState,
    classification: classificationState,
    factory: factoryState,
    fine: fineState,
    forecast: forecastState,

    // Actions
    fetchAlerts,
    generateDemoAlerts,
    acknowledgeAlert,
    traceSource,
    classifyPollution,
    getFactoryDetails,
    getNearbyFactories,
    generateFine,
    downloadFinePdf,
    fetchForecast,
    clearTraceState,
    clearClassificationState,
    clearFineState,
    clearForecastState,
  };
}
