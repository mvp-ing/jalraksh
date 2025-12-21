/**
 * Pollution categories and constants for Inspector Mode
 */

export const POLLUTION_CATEGORIES = {
  industrial_dye: {
    name: 'Industrial Dye Discharge',
    indicators: ['high_conductivity', 'abnormal_ph', 'temperature_spike'],
    industryTypes: ['Textile Dyeing & Bleaching'],
    actSection: 'Section 25 of Water Act 1974',
    baseFine: 100000,
    color: '#9C27B0',
    icon: 'factory',
  },
  sewage: {
    name: 'Sewage Contamination',
    indicators: ['high_fecal_coliform', 'high_total_coliform', 'elevated_bod'],
    industryTypes: ['Common Effluent Treatment Plant', 'Sewage Treatment Plant'],
    actSection: 'Section 25 of Water Act 1974',
    baseFine: 50000,
    color: '#795548',
    icon: 'water-off',
  },
  agricultural_runoff: {
    name: 'Agricultural Runoff',
    indicators: ['high_nitrate', 'moderate_bod'],
    industryTypes: [],
    actSection: 'Section 24 of Water Act 1974',
    baseFine: 25000,
    color: '#4CAF50',
    icon: 'leaf',
  },
  thermal: {
    name: 'Thermal Pollution',
    indicators: ['high_temperature', 'low_do'],
    industryTypes: ['Thermal Power Station'],
    actSection: 'Section 21 of Air Act 1981',
    baseFine: 75000,
    color: '#FF5722',
    icon: 'thermometer',
  },
  chemical_industrial: {
    name: 'Chemical Industrial Waste',
    indicators: ['extreme_ph', 'high_conductivity', 'low_do'],
    industryTypes: ['Light Engineering / Assembly', 'Chemical Manufacturing'],
    actSection: 'Hazardous Waste Rules 2016',
    baseFine: 200000,
    color: '#F44336',
    icon: 'flask',
  },
  organic_industrial: {
    name: 'Organic Industrial Waste',
    indicators: ['very_high_bod', 'low_do'],
    industryTypes: ['Food Processing / Distillery', 'Leather Tanning'],
    actSection: 'Section 25 of Water Act 1974',
    baseFine: 150000,
    color: '#FF9800',
    icon: 'biohazard',
  },
} as const;

export const SEVERITY_COLORS = {
  low: '#4CAF50',
  medium: '#FFC107',
  high: '#FF9800',
  critical: '#F44336',
} as const;

export const SEVERITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
} as const;

export const STATUS_COLORS = {
  new: '#2196F3',
  acknowledged: '#9C27B0',
  investigating: '#FF9800',
  resolved: '#4CAF50',
} as const;

export const PERMIT_STATUS_COLORS = {
  ACTIVE: '#4CAF50',
  EXPIRED: '#F44336',
  REVOKED: '#9E9E9E',
} as const;

// Forecast severity colors (from STGNN model)
export const FORECAST_SEVERITY_COLORS = {
  SAFE: SEVERITY_COLORS.low,
  LOW: SEVERITY_COLORS.low,
  MEDIUM: SEVERITY_COLORS.medium,
  HIGH: SEVERITY_COLORS.high,
  CRITICAL: SEVERITY_COLORS.critical,
} as const;

export const HORIZON_COLORS = {
  1: '#2196F3',
  2: '#4CAF50',
  3: '#FFC107',
} as const;

export const WATER_QUALITY_THRESHOLDS = {
  temperature: { normalMax: 35.0, unit: '°C', label: 'Temperature' },
  dissolved_oxygen: { normalMin: 5.0, unit: 'mg/L', label: 'Dissolved Oxygen' },
  ph: { normalMin: 6.5, normalMax: 8.5, unit: '', label: 'pH' },
  conductivity: { normalMax: 1500, unit: 'µmho/cm', label: 'Conductivity' },
  bod: { normalMax: 3.0, unit: 'mg/L', label: 'BOD' },
  nitrate_n: { normalMax: 10.0, unit: 'mg/L', label: 'Nitrate-N' },
  fecal_coliform: { normalMax: 500, unit: 'MPN/100ml', label: 'Fecal Coliform' },
  total_coliform: { normalMax: 5000, unit: 'MPN/100ml', label: 'Total Coliform' },
} as const;

export type PollutionCategory = keyof typeof POLLUTION_CATEGORIES;
export type SeverityLevel = keyof typeof SEVERITY_COLORS;
export type AlertStatusType = keyof typeof STATUS_COLORS;
export type PermitStatusType = keyof typeof PERMIT_STATUS_COLORS;
