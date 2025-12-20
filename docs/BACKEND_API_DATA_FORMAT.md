# Jalrakshak Backend API Data Format Specification

> **Version:** 1.1  
> **Last Updated:** 2025-12-20  
> **Purpose:** This document defines the exact data formats, keys, and types required by the frontend Kepler.gl map visualization.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture: What Backend Sends vs Frontend Generates](#architecture-what-backend-sends-vs-frontend-generates)
3. [Dataset 1: River Coordinates](#dataset-1-river-coordinates)
4. [Dataset 2: Municipal Station Readings](#dataset-2-municipal-station-readings)
5. [Dataset 3: Suspect Links (Pollution Attribution)](#dataset-3-suspect-links-pollution-attribution)
6. [Enumerations & Constants](#enumerations--constants)
7. [Time-Series Requirements](#time-series-requirements)
8. [Complete API Response Example](#complete-api-response-example)
9. [Frontend Processing Logic](#frontend-processing-logic)

---

## Overview

The frontend uses **Kepler.gl** for map visualization. The backend sends raw data, and the frontend generates derived visualizations (like pollution segments) from this data.

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ River           │  │ Municipal       │  │ Suspect      │ │
│  │ Coordinates     │  │ Station Data    │  │ Links        │ │
│  │ (GeoJSON)       │  │ (Time-series)   │  │ (Static)     │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
└───────────┼─────────────────────┼─────────────────┼──────────┘
            │                     │                 │
            ▼                     ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Frontend Processing:                                    ││
│  │  • Finds closest river point for each station           ││
│  │  • Generates pollution segments (GeoJSON lines)         ││
│  │  • Creates river monitoring points on river             ││
│  │  • Colors segments based on station severity            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Pollution    │  │ Municipal    │  │ Suspect      │       │
│  │ Segments     │  │ Stations     │  │ Arcs         │       │
│  │ (generated)  │  │ (points)     │  │ (arcs)       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                           │                                   │
│                           ▼                                   │
│                    ┌──────────────┐                          │
│                    │  Kepler.gl   │                          │
│                    │  Map         │                          │
│                    └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture: What Backend Sends vs Frontend Generates

### ✅ Backend MUST Send (3 datasets)

| Dataset | Description | Updates |
|---------|-------------|---------|
| **River Coordinates** | GeoJSON with river path coordinates | Static (one-time load) |
| **Municipal Station Readings** | Sensor readings per station per timestamp | Time-series |
| **Suspect Links** | Factory attribution data | On detection |

### 🔄 Frontend GENERATES (derived data)

| Generated Data | Source | Purpose |
|----------------|--------|---------|
| **Pollution Segments** | River coords + Station readings | Colored lines on river |
| **River Monitoring Points** | Station readings + closest river point | On-river point markers |
| **Alert Levels** | Calculated from severity_score | Color coding |
| **Pollution Categories** | Calculated from severity_score | Labels |

---

## Dataset 1: River Coordinates

**Purpose:** Provides the river path coordinates. Frontend uses these to generate pollution segment geometries.

**Format:** Array of coordinate pairs `[longitude, latitude]`

**When to Send:** Once on initial load (static data)

### Required Format

```json
{
  "river_coordinates": [
    [77.2358125, 28.6689529],
    [77.2363436, 28.6680633],
    [77.2372069, 28.6670075],
    [77.237766, 28.6663339],
    [77.2392672, 28.6649049]
  ]
}
```

### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `river_coordinates` | `Array<[number, number]>` | Array of `[longitude, latitude]` pairs |

### Important Notes

- ⚠️ Coordinates are in **GeoJSON order**: `[longitude, latitude]`
- Points should be ordered from **upstream to downstream**
- Include enough points for smooth river visualization
- Typical: 100-200 points for a river stretch

### Alternative: GeoJSON Format

You can also send as a GeoJSON FeatureCollection:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "river_name": "Yamuna River",
        "segment_name": "Delhi Stretch"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [77.2358125, 28.6689529],
          [77.2363436, 28.6680633]
        ]
      }
    }
  ]
}
```

---

## Dataset 2: Municipal Station Readings

**Purpose:** Time-series sensor data from monitoring stations. The frontend uses this to:
1. Display station markers on the map
2. Calculate pollution levels for river segments
3. Generate river monitoring points

**Format:** Row-based format with fields and rows

**When to Send:** Periodically with new readings, or as a batch for time-series playback

### Required Data Structure

```json
{
  "info": { "id": "municipal_stations", "label": "Municipal Monitoring Stations" },
  "data": {
    "fields": [...],
    "rows": [...]
  }
}
```

### Field Schema

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `timestamp` | `timestamp` | ✅ | ISO 8601 datetime | `"2024-01-01T00:00:00Z"` |
| `station_id` | `string` | ✅ | Unique station identifier | `"STN_001"` |
| `station_name` | `string` | ✅ | Human-readable name | `"Wazirabad Barrage"` |
| `lat` | `real` | ✅ | Station latitude | `28.6700` |
| `lon` | `real` | ✅ | Station longitude | `77.2050` |
| `severity_score` | `real` | ✅ | **PRIMARY** Pollution severity (0.0 - 1.0) | `0.55` |
| `ph` | `real` | ❌ | pH level (3.0 - 9.0) | `5.5` |
| `conductivity` | `integer` | ❌ | Conductivity (µS/cm) | `1350` |
| `do_level` | `real` | ❌ | Dissolved Oxygen (mg/L) | `3.2` |
| `turbidity` | `integer` | ❌ | Turbidity (NTU) | `95` |
| `water_temp` | `real` | ❌ | Water temperature (°C) | `26.4` |
| `bod` | `real` | ❌ | Biochemical Oxygen Demand (mg/L) | `12.5` |
| `cod` | `real` | ❌ | Chemical Oxygen Demand (mg/L) | `85` |

### ⚠️ Critical Field: `severity_score`

The `severity_score` is the **most important field**. Frontend uses it to:
- Color the pollution segments
- Determine alert levels
- Size point markers

**Model should output this as a normalized value between 0.0 and 1.0:**

| Severity Range | Meaning | Expected Color |
|----------------|---------|----------------|
| 0.00 - 0.20 | Normal/Clean | Green |
| 0.20 - 0.40 | Agricultural Runoff | Lime |
| 0.40 - 0.60 | Sewage/Organic | Yellow |
| 0.60 - 0.80 | Industrial Chemical | Orange/Red |
| 0.80 - 1.00 | Critical | Dark Red |

### Complete Example

```json
{
  "info": { "id": "municipal_stations", "label": "Municipal Monitoring Stations" },
  "data": {
    "fields": [
      { "name": "timestamp", "type": "timestamp", "format": "YYYY-MM-DDTHH:mm:ssZ" },
      { "name": "station_id", "type": "string" },
      { "name": "station_name", "type": "string" },
      { "name": "lat", "type": "real" },
      { "name": "lon", "type": "real" },
      { "name": "severity_score", "type": "real" },
      { "name": "ph", "type": "real" },
      { "name": "conductivity", "type": "integer" },
      { "name": "do_level", "type": "real" },
      { "name": "turbidity", "type": "integer" },
      { "name": "water_temp", "type": "real" }
    ],
    "rows": [
      ["2024-01-01T00:00:00Z", "STN_001", "Wazirabad Barrage", 28.6700, 77.2050, 0.08, 7.1, 486, 6.9, 18, 22.6],
      ["2024-01-01T00:00:00Z", "STN_002", "Old Railway Bridge", 28.6600, 77.2280, 0.10, 7.0, 520, 6.7, 22, 23.1],
      ["2024-01-01T00:00:00Z", "STN_003", "ITO Bridge", 28.6530, 77.2320, 0.12, 6.9, 550, 6.5, 25, 23.5],
      ["2024-01-01T12:00:00Z", "STN_001", "Wazirabad Barrage", 28.6700, 77.2050, 0.09, 7.0, 495, 6.8, 20, 23.2],
      ["2024-01-01T12:00:00Z", "STN_002", "Old Railway Bridge", 28.6600, 77.2280, 0.15, 6.8, 580, 6.4, 28, 24.0]
    ]
  }
}
```

### Station Order

**Important:** Stations should be ordered from **upstream to downstream**. The frontend uses this ordering to generate segments between consecutive stations.

### Recommended Station Data

| Station ID | Station Name | Lat | Lon |
|------------|--------------|-----|-----|
| STN_001 | Wazirabad Barrage | 28.6700 | 77.2050 |
| STN_002 | Old Railway Bridge | 28.6600 | 77.2280 |
| STN_003 | ITO Bridge | 28.6530 | 77.2320 |
| STN_004 | Nizamuddin Bridge | 28.6020 | 77.2300 |
| STN_005 | Sarai Kale Khan | 28.5870 | 77.2500 |
| STN_006 | Okhla Barrage | 28.5450 | 77.2850 |
| STN_007 | Kalindi Kunj | 28.5320 | 77.3000 |
| STN_008 | Faridabad Border | 28.4860 | 77.3280 |

---

## Dataset 3: Suspect Links (Pollution Attribution)

**Purpose:** Links pollution detection points to suspected pollution sources (factories, STPs, etc.). Used to show attribution arcs on the map.

**When to Send:** When pollution is detected and attribution is calculated

### Field Schema

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `source_lat` | `real` | ✅ | Pollution detection point latitude (on river) | `28.6591811` |
| `source_lon` | `real` | ✅ | Pollution detection point longitude (on river) | `77.2582841` |
| `target_lat` | `real` | ✅ | Suspected factory latitude | `28.6640` |
| `target_lon` | `real` | ✅ | Suspected factory longitude | `77.2650` |
| `incident_id` | `string` | ✅ | Unique incident identifier | `"INC-001"` |
| `suspect_name` | `string` | ✅ | Factory/source name | `"Shahdara Rubber Factory"` |
| `suspect_type` | `string` | ✅ | Industry type | `"Rubber Manufacturing"` |
| `distance_upstream_m` | `integer` | ✅ | Distance upstream (meters) | `380` |
| `suspicion_score` | `real` | ✅ | Attribution confidence (0.0 - 1.0) | `0.82` |
| `permit_status` | `string` | ✅ | Permit status | `"EXPIRED"` |
| `evidence` | `string` | ❌ | Evidence description | `"Sulfur compounds detected"` |
| `last_inspection` | `string` | ❌ | Last inspection date | `"2022-04-12"` |
| `historical_violations` | `integer` | ❌ | Number of past violations | `4` |

### Complete Example

```json
{
  "info": { "id": "suspect_links", "label": "Pollution Attribution" },
  "data": {
    "fields": [
      { "name": "source_lat", "type": "real" },
      { "name": "source_lon", "type": "real" },
      { "name": "target_lat", "type": "real" },
      { "name": "target_lon", "type": "real" },
      { "name": "incident_id", "type": "string" },
      { "name": "suspect_name", "type": "string" },
      { "name": "suspect_type", "type": "string" },
      { "name": "distance_upstream_m", "type": "integer" },
      { "name": "suspicion_score", "type": "real" },
      { "name": "permit_status", "type": "string" },
      { "name": "evidence", "type": "string" },
      { "name": "last_inspection", "type": "string" },
      { "name": "historical_violations", "type": "integer" }
    ],
    "rows": [
      [28.6591811, 77.2582841, 28.6640, 77.2650, "INC-001", "Shahdara Rubber Factory", "Rubber Manufacturing", 380, 0.82, "EXPIRED", "Sulfur compounds detected.", "2022-04-12", 4],
      [28.6521342, 77.2626936, 28.6580, 77.2700, "INC-002", "Apex Dyeing Works", "Textile Industry", 450, 0.92, "EXPIRED", "High conductivity matches effluent.", "2022-11-20", 3]
    ]
  }
}
```

---

## Enumerations & Constants

### Permit Status Values

| Value | Description |
|-------|-------------|
| `ACTIVE` | Valid permit |
| `EXPIRED` | Permit has expired |
| `NA` | Not applicable (informal sector) |
| `REVOKED` | Permit was revoked |

### Suspect Types

| Value | Description |
|-------|-------------|
| `Rubber Manufacturing` | Rubber factory |
| `Textile Dyeing` | Textile/dyeing unit |
| `Textile Industry` | General textile industry |
| `Power Generation` | Power plant (thermal discharge) |
| `Leather Tanning` | Tannery |
| `Sewage Treatment Plant` | STP outfall |
| `Chemical Manufacturing` | Chemical factory |

### Frontend-Calculated Values

These are calculated by the frontend from `severity_score`:

**Pollution Category:**
```javascript
function getPollutionCategory(severity) {
  if (severity < 0.20) return 'NORMAL';
  if (severity < 0.40) return 'AGRICULTURAL_RUNOFF';
  if (severity < 0.60) return 'SEWAGE_ORGANIC';
  if (severity < 0.80) return 'INDUSTRIAL_CHEMICAL';
  return 'CRITICAL';
}
```

**Alert Level:**
```javascript
function getAlertLevel(severity) {
  if (severity > 0.65) return 'RED';
  if (severity > 0.45) return 'ORANGE';
  if (severity > 0.25) return 'YELLOW';
  return 'GREEN';
}
```

---

## Time-Series Requirements

### Timestamp Format

All timestamps must be in **ISO 8601 format** with UTC timezone:

```
YYYY-MM-DDTHH:mm:ssZ
```

### Data Structure for Time-Series

Each timestamp should have readings for **all stations**:

```
Timestamp 1:
  - Station 1: severity = 0.08
  - Station 2: severity = 0.10
  - Station 3: severity = 0.12
  ...

Timestamp 2:
  - Station 1: severity = 0.09
  - Station 2: severity = 0.15
  - Station 3: severity = 0.25
  ...
```

### Recommended Intervals

| Interval | Use Case |
|----------|----------|
| 6 hours | Fine-grained monitoring |
| 12 hours | Standard demo (recommended) |
| 24 hours | Daily summaries |

---

## Complete API Response Example

### Full Response Structure

```json
{
  "river_coordinates": [
    [77.2358125, 28.6689529],
    [77.2363436, 28.6680633],
    [77.2372069, 28.6670075],
    [77.237766, 28.6663339]
  ],
  
  "municipal_stations": {
    "info": { "id": "municipal_stations", "label": "Municipal Monitoring Stations" },
    "data": {
      "fields": [
        { "name": "timestamp", "type": "timestamp", "format": "YYYY-MM-DDTHH:mm:ssZ" },
        { "name": "station_id", "type": "string" },
        { "name": "station_name", "type": "string" },
        { "name": "lat", "type": "real" },
        { "name": "lon", "type": "real" },
        { "name": "severity_score", "type": "real" },
        { "name": "ph", "type": "real" },
        { "name": "conductivity", "type": "integer" },
        { "name": "do_level", "type": "real" },
        { "name": "turbidity", "type": "integer" }
      ],
      "rows": [
        ["2024-01-01T00:00:00Z", "STN_001", "Wazirabad Barrage", 28.6700, 77.2050, 0.08, 7.1, 486, 6.9, 18],
        ["2024-01-01T00:00:00Z", "STN_002", "Old Railway Bridge", 28.6600, 77.2280, 0.10, 7.0, 520, 6.7, 22],
        ["2024-01-01T00:00:00Z", "STN_003", "ITO Bridge", 28.6530, 77.2320, 0.55, 5.5, 1200, 3.5, 85]
      ]
    }
  },
  
  "suspect_links": {
    "info": { "id": "suspect_links", "label": "Pollution Attribution" },
    "data": {
      "fields": [
        { "name": "source_lat", "type": "real" },
        { "name": "source_lon", "type": "real" },
        { "name": "target_lat", "type": "real" },
        { "name": "target_lon", "type": "real" },
        { "name": "incident_id", "type": "string" },
        { "name": "suspect_name", "type": "string" },
        { "name": "suspect_type", "type": "string" },
        { "name": "distance_upstream_m", "type": "integer" },
        { "name": "suspicion_score", "type": "real" },
        { "name": "permit_status", "type": "string" },
        { "name": "evidence", "type": "string" },
        { "name": "last_inspection", "type": "string" },
        { "name": "historical_violations", "type": "integer" }
      ],
      "rows": [
        [28.6591811, 77.2582841, 28.6640, 77.2650, "INC-001", "Shahdara Rubber Factory", "Rubber Manufacturing", 380, 0.82, "EXPIRED", "Sulfur compounds detected.", "2022-04-12", 4]
      ]
    }
  }
}
```

---

## Frontend Processing Logic

The frontend (`sample-data.js`) performs these calculations:

### 1. Find Closest River Point for Each Station

```javascript
function findClosestRiverPoint(stationLat, stationLon, riverCoordinates) {
  let minDist = Infinity;
  let closestIdx = 0;
  
  for (let i = 0; i < riverCoordinates.length; i++) {
    const [lon, lat] = riverCoordinates[i];
    const dist = haversineDistance(stationLat, stationLon, lat, lon);
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }
  
  return {
    coordIndex: closestIdx,
    river_lat: riverCoordinates[closestIdx][1],
    river_lon: riverCoordinates[closestIdx][0]
  };
}
```

### 2. Generate Pollution Segments

For each pair of consecutive stations, the frontend:
1. Gets the river coordinate index for each station
2. Extracts the river coordinates between them
3. Creates a GeoJSON LineString
4. Assigns the upstream station's severity to color the segment

```javascript
// Segment from Station A to Station B uses Station A's severity
const segment = {
  geometry: {
    type: 'LineString',
    coordinates: riverCoords.slice(stationA.coordIndex, stationB.coordIndex + 1)
  },
  severity_score: stationA.severity_score
};
```

### 3. Generate River Monitoring Points

Places markers **on the river** at the closest point to each station:

```javascript
const riverPoint = {
  lat: station.river_lat,  // Closest point ON river
  lon: station.river_lon,
  severity_score: station.severity_score
};
```

---

## Quick Reference

### Backend Must Send

| Data | Key Fields | Format |
|------|------------|--------|
| River Coordinates | `[[lon, lat], ...]` | Array |
| Municipal Stations | `timestamp`, `station_id`, `lat`, `lon`, `severity_score` | Row-based |
| Suspect Links | `source_lat/lon`, `target_lat/lon`, `suspicion_score` | Row-based |

### Frontend Generates

| Data | From | Purpose |
|------|------|---------|
| Pollution Segments | River coords + Station severity | Colored river lines |
| River Monitoring Points | Station position + River coords | On-river markers |
| Alert Levels | severity_score thresholds | Color coding |
| Pollution Categories | severity_score thresholds | Labels |

### Minimum Viable API Response

```json
{
  "river_coordinates": [[77.23, 28.66], [77.24, 28.65], ...],
  "municipal_stations": {
    "data": {
      "fields": [
        {"name": "timestamp", "type": "timestamp"},
        {"name": "station_id", "type": "string"},
        {"name": "station_name", "type": "string"},
        {"name": "lat", "type": "real"},
        {"name": "lon", "type": "real"},
        {"name": "severity_score", "type": "real"}
      ],
      "rows": [
        ["2024-01-01T00:00:00Z", "STN_001", "Station 1", 28.67, 77.21, 0.25]
      ]
    }
  }
}
```

---

*Document generated for Jalrakshak Project - River Pollution Monitoring System*
