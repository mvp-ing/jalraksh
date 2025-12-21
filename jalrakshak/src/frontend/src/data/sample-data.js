// SPDX-License-Identifier: MIT
// Copyright Jalraksh

/**
 * Sample Data Module for Jalrakshak Pollution Monitoring Demo
 * 
 * Data structure aligned with actual data sources:
 * - Sensor Stream: Indian water quality data with CPCB parameters
 * - Municipal Records: PCB license/permit metadata
 * - Satellite Imagery: Sentinel-2 frame references
 * 
 * NARRATIVE TIME SERIES:
 * - Day 1-2: River is clean (baseline)
 * - Day 3-4: Factories start polluting (pollution increases)
 * - Day 5-7: Pollution spreads and worsens (peak pollution)
 */

import riverNetworkData from './river-network.json';
import keplerConfig from './kepler-config.json';

/**
 * All river coordinates from export.geojson
 */
const riverRouteCoordinates = [
  [77.2358125, 28.6689529],
  [77.2363436, 28.6680633],
  [77.2372069, 28.6670075],
  [77.237766, 28.6663339],
  [77.2392672, 28.6649049],
  [77.2403991, 28.6641471],
  [77.2416222, 28.6635823],
  [77.243489, 28.6631681],
  [77.2458896, 28.6628009],
  [77.2474801, 28.6625656],
  [77.2495723, 28.6620384],
  [77.2530967, 28.6612052],
  [77.254875, 28.6608004],
  [77.255795, 28.6605368],
  [77.2566587, 28.6601226],
  [77.2582841, 28.6591811],
  [77.2590834, 28.6584421],
  [77.2598183, 28.6575289],
  [77.2612989, 28.6552129],
  [77.2621036, 28.6533817],
  [77.2626936, 28.6521342],
  [77.2634983, 28.6493191],
  [77.2640133, 28.6468711],
  [77.264024, 28.6452798],
  [77.2638845, 28.6437639],
  [77.2627741, 28.6401717],
  [77.2616637, 28.6378035],
  [77.260108, 28.6352611],
  [77.2579837, 28.6327092],
  [77.2553176, 28.6296675],
  [77.2545719, 28.6286645],
  [77.2538531, 28.6254956],
  [77.2537243, 28.6240642],
  [77.2537631, 28.6228142],
  [77.2544378, 28.6205278],
  [77.2548294, 28.6190821],
  [77.2554141, 28.616299],
  [77.255795, 28.6144107],
  [77.2562885, 28.6115098],
  [77.2564807, 28.6106028],
  [77.2568893, 28.6086747],
  [77.2573507, 28.6069134],
  [77.258242, 28.6048925],
  [77.2591638, 28.6032304],
  [77.2598934, 28.6023356],
  [77.2608054, 28.6015255],
  [77.2664821, 28.5966533],
  [77.2696109, 28.5939872],
  [77.2727363, 28.5917884],
  [77.2786957, 28.5878944],
  [77.2813296, 28.5861798],
  [77.2839796, 28.5844558],
  [77.2849238, 28.5838528],
  [77.2860932, 28.5831557],
  [77.2872841, 28.5823643],
  [77.2885179, 28.581262],
  [77.2914255, 28.577352],
  [77.2936678, 28.5740167],
  [77.2954166, 28.5710769],
  [77.2962427, 28.5699086],
  [77.2968542, 28.5688532],
  [77.2984314, 28.5660076],
  [77.2987601, 28.5652869],
  [77.2990644, 28.5645659],
  [77.2993755, 28.5639157],
  [77.3000944, 28.5628933],
  [77.3010412, 28.5618026],
  [77.3015964, 28.5612678],
  [77.3021087, 28.5608697],
  [77.3059308, 28.5582429],
  [77.3088598, 28.555152],
  [77.311615, 28.5515456],
  [77.3124862, 28.5495683],
  [77.3128885, 28.5487908],
  [77.313441, 28.5480133],
  [77.3139212, 28.5475279],
  [77.3149162, 28.5444696],
  [77.316498, 28.5431875],
  [77.3181081, 28.5418825],
  [77.3196048, 28.541039],
  [77.3226678, 28.5394037],
  [77.3248029, 28.5376318],
  [77.3267555, 28.5358221],
  [77.3281717, 28.53438],
  [77.3295879, 28.5329661],
  [77.3309392, 28.5315889],
  [77.3319375, 28.5303458],
  [77.3345554, 28.5272728],
  [77.3372483, 28.5244449],
  [77.3390132, 28.5224465],
  [77.3405528, 28.5206648],
  [77.3419357, 28.5190548],
  [77.3435891, 28.5169035],
  [77.3455846, 28.5140658],
  [77.3473388, 28.5116335],
  [77.3477638, 28.5109526],
  [77.3492157, 28.5086394],
  [77.350198, 28.5066556],
  [77.3511314, 28.5044871],
  [77.3520315, 28.5024601],
  [77.3526269, 28.5012876],
  [77.3526834, 28.5009231],
  [77.3531543, 28.4996682],
  [77.3533094, 28.4992826],
  [77.3539542, 28.4976879],
  [77.3543501, 28.4967085],
  [77.3555303, 28.4936865],
  [77.3579979, 28.4877129],
  [77.3586643, 28.4865697],
  [77.3595106, 28.485214],
  [77.3654222, 28.47899],
  [77.3671503, 28.4777228],
  [77.3685658, 28.4766559],
  [77.3699337, 28.4757505],
  [77.3717523, 28.4745858],
  [77.3751426, 28.4728128],
  [77.376732, 28.471921],
  [77.378667, 28.4707143],
  [77.3805606, 28.4692006],
  [77.382524, 28.4678283],
  [77.3840851, 28.4671068],
  [77.385276, 28.466739],
  [77.386939, 28.4664654],
  [77.3884677, 28.4664371],
  [77.3904473, 28.4666541],
  [77.3919815, 28.4670502],
  [77.3930544, 28.4674463],
  [77.3984152, 28.4688777],
  [77.4022436, 28.4700117],
  [77.4062133, 28.4713604],
  [77.4094963, 28.4726619],
  [77.4118674, 28.4733268],
  [77.4133319, 28.4736097],
  [77.4146622, 28.4735578],
  [77.4159121, 28.4733504],
  [77.4179307, 28.4721054]
];

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

/**
 * Find the closest point on the river to a given station location
 * Returns the index and coordinates of the closest river point
 */
function findClosestRiverPoint(stationLat, stationLon) {
  let minDist = Infinity;
  let closestIdx = 0;
  
  for (let i = 0; i < riverRouteCoordinates.length; i++) {
    const [lon, lat] = riverRouteCoordinates[i];
    const dist = haversineDistance(stationLat, stationLon, lat, lon);
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }
  
  const [closestLon, closestLat] = riverRouteCoordinates[closestIdx];
  return {
    coordIndex: closestIdx,
    river_lat: closestLat,
    river_lon: closestLon,
    distance_m: Math.round(minDist * 1000) // Convert to meters
  };
}

/**
 * Sensor Stations - Using actual CPCB data format
 * Focused on Delhi/Yamuna region to match river-network.json
 * Station codes are actual CPCB codes with adjusted positions near the river
 */
const stationLocations = [
  { 
    stn_code: '1479', 
    monitoring_location: 'WESTERN YAMUNA CANAL AT HAIDERPUR WATER WORKS, DELHI', 
    type_water_body: 'CANAL',
    state_name: 'DELHI',
    latitude: 28.6650, 
    longitude: 77.2400, 
    cleanSeverity: 0.08, 
    pollutedSeverity: 0.25
  },
  { 
    stn_code: '2057', 
    monitoring_location: 'YAMUNA AT WAZIRABAD BRIDGE, DELHI', 
    type_water_body: 'RIVER',
    state_name: 'DELHI',
    latitude: 28.6580, 
    longitude: 77.2550, 
    cleanSeverity: 0.12, 
    pollutedSeverity: 0.40
  },
  { 
    stn_code: '2058', 
    monitoring_location: 'YAMUNA AT ITO BRIDGE, DELHI', 
    type_water_body: 'RIVER',
    state_name: 'DELHI',
    latitude: 28.6280, 
    longitude: 77.2530, 
    cleanSeverity: 0.15, 
    pollutedSeverity: 0.55
  },
  { 
    stn_code: '2059', 
    monitoring_location: 'YAMUNA AT NIZAMUDDIN BRIDGE, DELHI', 
    type_water_body: 'RIVER',
    state_name: 'DELHI',
    latitude: 28.6020, 
    longitude: 77.2620, 
    cleanSeverity: 0.18, 
    pollutedSeverity: 0.72
  },
  { 
    stn_code: '2060', 
    monitoring_location: 'YAMUNA AT SARAI KALE KHAN, DELHI', 
    type_water_body: 'RIVER',
    state_name: 'DELHI',
    latitude: 28.5750, 
    longitude: 77.2850, 
    cleanSeverity: 0.22, 
    pollutedSeverity: 0.85
  },
  { 
    stn_code: '2061', 
    monitoring_location: 'YAMUNA AT OKHLA BARRAGE, DELHI', 
    type_water_body: 'RIVER',
    state_name: 'DELHI',
    latitude: 28.5450, 
    longitude: 77.3150, 
    cleanSeverity: 0.20, 
    pollutedSeverity: 0.92
  },
  { 
    stn_code: '2062', 
    monitoring_location: 'YAMUNA AT KALINDI KUNJ, DELHI', 
    type_water_body: 'RIVER',
    state_name: 'DELHI',
    latitude: 28.5200, 
    longitude: 77.3380, 
    cleanSeverity: 0.18, 
    pollutedSeverity: 0.88
  },
  { 
    stn_code: '2063', 
    monitoring_location: 'YAMUNA AT FARIDABAD BORDER', 
    type_water_body: 'RIVER',
    state_name: 'DELHI',
    latitude: 28.4850, 
    longitude: 77.3600, 
    cleanSeverity: 0.15, 
    pollutedSeverity: 0.75
  },
];

// Build sensor stations with calculated closest river points
const sensorStations = stationLocations.map(station => {
  const closest = findClosestRiverPoint(station.latitude, station.longitude);
  return {
    ...station,
    ...closest
  };
});

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Get pollution severity based on time phase
 * Phase 0-0.25: Clean river (Day 1-2)
 * Phase 0.25-0.5: Factories start polluting (Day 3-4)
 * Phase 0.5-1.0: Peak pollution (Day 5-7)
 */
function getSeverityForPhase(station, phase) {
  if (phase < 0.25) {
    // Clean phase - all stations show low pollution
    return station.cleanSeverity;
  } else if (phase < 0.5) {
    // Transition phase - pollution starting
    const transitionProgress = (phase - 0.25) / 0.25;
    return lerp(station.cleanSeverity, station.pollutedSeverity * 0.6, transitionProgress);
  } else {
    // Polluted phase - full pollution
    const pollutionProgress = (phase - 0.5) / 0.5;
    return lerp(station.pollutedSeverity * 0.6, station.pollutedSeverity, pollutionProgress);
  }
}

function getInterpolatedSeverity(coordIndex, phase) {
  // Find nearest stations
  let stationBefore = sensorStations[0];
  let stationAfter = sensorStations[sensorStations.length - 1];
  
  for (let i = 0; i < sensorStations.length - 1; i++) {
    if (coordIndex >= sensorStations[i].coordIndex && coordIndex <= sensorStations[i + 1].coordIndex) {
      stationBefore = sensorStations[i];
      stationAfter = sensorStations[i + 1];
      break;
    }
  }
  
  const severityBefore = getSeverityForPhase(stationBefore, phase);
  const severityAfter = getSeverityForPhase(stationAfter, phase);
  
  if (coordIndex <= sensorStations[0].coordIndex) {
    return getSeverityForPhase(sensorStations[0], phase);
  }
  if (coordIndex >= sensorStations[sensorStations.length - 1].coordIndex) {
    return getSeverityForPhase(sensorStations[sensorStations.length - 1], phase);
  }
  
  const range = stationAfter.coordIndex - stationBefore.coordIndex;
  const t = (coordIndex - stationBefore.coordIndex) / range;
  
  return lerp(severityBefore, severityAfter, t);
}

function getPollutionCategory(severity) {
  if (severity < 0.20) return 'NORMAL';
  if (severity < 0.40) return 'AGRICULTURAL_RUNOFF';
  if (severity < 0.60) return 'SEWAGE_ORGANIC';
  if (severity < 0.80) return 'INDUSTRIAL_CHEMICAL';
  return 'CRITICAL';
}

/**
 * Generate water quality parameters based on severity
 * Aligned with CPCB Indian Water Quality data format:
 * - Temperature (C)
 * - Dissolved Oxygen (mg/L) 
 * - pH
 * - Conductivity (µmho/cm)
 * - BOD (mg/L)
 * - NitrateN (mg/L)
 * - Fecal Coliform (MPN/100ml)
 * - Total Coliform (MPN/100ml)
 */
function getWaterQualityParams(severity) {
  return {
    // Temperature increases with pollution (thermal discharge)
    temperature_c: parseFloat((22 + severity * 10).toFixed(1)),
    // Dissolved oxygen decreases with pollution (organic load consumes oxygen)
    dissolved_oxygen_mg_l: parseFloat((8.0 - severity * 7.0).toFixed(1)),
    // pH becomes more acidic/alkaline with pollution
    ph: parseFloat((7.5 - severity * 2.0 + (Math.random() - 0.5) * 0.5).toFixed(2)),
    // Conductivity increases with dissolved pollutants
    conductivity_umho_cm: Math.round(200 + severity * 3500),
    // BOD increases with organic pollution
    bod_mg_l: parseFloat((2 + severity * 30).toFixed(1)),
    // Nitrate increases with agricultural/sewage runoff
    nitrate_n_mg_l: parseFloat((0.5 + severity * 15).toFixed(2)),
    // Fecal coliform increases with sewage contamination
    fecal_coliform_mpn: Math.round(10 + severity * 50000),
    // Total coliform increases with contamination
    total_coliform_mpn: Math.round(50 + severity * 150000)
  };
}

/**
 * Generate pollution segment data - LINE SEGMENTS between stations
 * Each segment gets the color/severity of the starting station
 * This maps municipal station sensor readings onto the actual river path
 */
function generatePollutionSegmentData() {
  const data = [];
  
  // 14 time steps across 7 days - using ISO date format like CPCB data
  const timestamps = [
    // Day 1 - Clean
    { ts: '2024-01-01', phase: 0.00 },
    { ts: '2024-01-01', phase: 0.07 },
    // Day 2 - Still clean
    { ts: '2024-01-02', phase: 0.14 },
    { ts: '2024-01-02', phase: 0.21 },
    // Day 3 - Factories start polluting
    { ts: '2024-01-03', phase: 0.28 },
    { ts: '2024-01-03', phase: 0.35 },
    // Day 4 - Pollution increasing
    { ts: '2024-01-04', phase: 0.42 },
    { ts: '2024-01-04', phase: 0.50 },
    // Day 5 - Heavy pollution
    { ts: '2024-01-05', phase: 0.57 },
    { ts: '2024-01-05', phase: 0.64 },
    // Day 6 - Peak pollution
    { ts: '2024-01-06', phase: 0.71 },
    { ts: '2024-01-06', phase: 0.78 },
    // Day 7 - Maximum pollution
    { ts: '2024-01-07', phase: 0.85 },
    { ts: '2024-01-07', phase: 1.00 },
  ];
  
  timestamps.forEach(({ ts, phase }, timeIdx) => {
    // Create a segment from each station to the next
    for (let i = 0; i < sensorStations.length; i++) {
      const station = sensorStations[i];
      const severity = getSeverityForPhase(station, phase);
      const category = getPollutionCategory(severity);
      const params = getWaterQualityParams(severity);
      
      // Get the river coordinates for this segment
      const startIdx = station.coordIndex;
      const endIdx = (i < sensorStations.length - 1) 
        ? sensorStations[i + 1].coordIndex 
        : riverRouteCoordinates.length - 1;
      
      // Extract coordinates for this segment (GeoJSON format: [lon, lat])
      const segmentCoords = riverRouteCoordinates.slice(startIdx, endIdx + 1);
      
      // Create GeoJSON LineString for this segment
      const geometry = JSON.stringify({
        type: 'LineString',
        coordinates: segmentCoords
      });
      
      // Use timestamp with time component for animation
      const fullTimestamp = `${ts}T${String(timeIdx % 2 === 0 ? 0 : 12).padStart(2, '0')}:00:00Z`;
      
      data.push({
        timestamp: fullTimestamp,
        date: ts,
        segment_id: `SEG_${station.stn_code}`,
        stn_code: station.stn_code,
        monitoring_location: station.monitoring_location,
        type_water_body: station.type_water_body,
        state_name: station.state_name,
        // Start point (river point for this station)
        start_lat: station.river_lat,
        start_lon: station.river_lon,
        // End point (river point for next station)
        end_lat: (i < sensorStations.length - 1) ? sensorStations[i + 1].river_lat : riverRouteCoordinates[riverRouteCoordinates.length - 1][1],
        end_lon: (i < sensorStations.length - 1) ? sensorStations[i + 1].river_lon : riverRouteCoordinates[riverRouteCoordinates.length - 1][0],
        // GeoJSON geometry for the line
        geometry: geometry,
        // Pollution metrics aligned with CPCB format
        severity_score: parseFloat(severity.toFixed(3)),
        pollution_category: category,
        // CPCB water quality parameters
        ...params
      });
    }
  });
  
  return data;
}

const pollutionSegmentData = generatePollutionSegmentData();

/**
 * Municipal Station Data - aligned with CPCB Indian Water Quality Monitoring format
 * Uses same field names as Indian_water_data_augmented.csv
 */
function generateMunicipalStationData() {
  const data = [];
  
  const timestamps = [
    { ts: '2024-01-01', phase: 0.00 },
    { ts: '2024-01-01', phase: 0.07 },
    { ts: '2024-01-02', phase: 0.14 },
    { ts: '2024-01-02', phase: 0.21 },
    { ts: '2024-01-03', phase: 0.28 },
    { ts: '2024-01-03', phase: 0.35 },
    { ts: '2024-01-04', phase: 0.42 },
    { ts: '2024-01-04', phase: 0.50 },
    { ts: '2024-01-05', phase: 0.57 },
    { ts: '2024-01-05', phase: 0.64 },
    { ts: '2024-01-06', phase: 0.71 },
    { ts: '2024-01-06', phase: 0.78 },
    { ts: '2024-01-07', phase: 0.85 },
    { ts: '2024-01-07', phase: 1.00 },
  ];
  
  timestamps.forEach(({ ts, phase }, timeIdx) => {
    sensorStations.forEach(station => {
      const severity = getSeverityForPhase(station, phase);
      const category = getPollutionCategory(severity);
      const isAnomaly = severity > 0.60;
      const params = getWaterQualityParams(severity);
      
      let alertLevel = 'GREEN';
      if (severity > 0.65) alertLevel = 'RED';
      else if (severity > 0.45) alertLevel = 'ORANGE';
      else if (severity > 0.25) alertLevel = 'YELLOW';
      
      // Use timestamp with time component for animation
      const fullTimestamp = `${ts}T${String(timeIdx % 2 === 0 ? 0 : 12).padStart(2, '0')}:00:00Z`;
      
      data.push({
        // Timestamp fields
        timestamp: fullTimestamp,
        date: ts,
        // CPCB station identification
        stn_code: station.stn_code,
        monitoring_location: station.monitoring_location,
        type_water_body: station.type_water_body,
        state_name: station.state_name,
        // Station location
        latitude: station.latitude,
        longitude: station.longitude,
        // Distance to river
        distance_to_river_m: station.distance_m,
        // Pollution metrics
        severity_score: parseFloat(severity.toFixed(2)),
        pollution_category: category,
        is_anomaly: isAnomaly,
        alert_level: alertLevel,
        // CPCB water quality parameters
        ...params,
        // Sentinel satellite images
        sentinel_images: station.sentinel_images || []
      });
    });
  });
  
  return data;
}

/**
 * River Monitoring Points - points ON the river showing projected readings
 * These are the closest river points to each municipal station
 */
function generateRiverMonitoringPointsData() {
  const data = [];
  
  const timestamps = [
    { ts: '2024-01-01', phase: 0.00 },
    { ts: '2024-01-01', phase: 0.07 },
    { ts: '2024-01-02', phase: 0.14 },
    { ts: '2024-01-02', phase: 0.21 },
    { ts: '2024-01-03', phase: 0.28 },
    { ts: '2024-01-03', phase: 0.35 },
    { ts: '2024-01-04', phase: 0.42 },
    { ts: '2024-01-04', phase: 0.50 },
    { ts: '2024-01-05', phase: 0.57 },
    { ts: '2024-01-05', phase: 0.64 },
    { ts: '2024-01-06', phase: 0.71 },
    { ts: '2024-01-06', phase: 0.78 },
    { ts: '2024-01-07', phase: 0.85 },
    { ts: '2024-01-07', phase: 1.00 },
  ];
  
  timestamps.forEach(({ ts, phase }, timeIdx) => {
    sensorStations.forEach(station => {
      const severity = getSeverityForPhase(station, phase);
      const category = getPollutionCategory(severity);
      
      let alertLevel = 'GREEN';
      if (severity > 0.65) alertLevel = 'RED';
      else if (severity > 0.45) alertLevel = 'ORANGE';
      else if (severity > 0.25) alertLevel = 'YELLOW';
      
      // Use timestamp with time component for animation
      const fullTimestamp = `${ts}T${String(timeIdx % 2 === 0 ? 0 : 12).padStart(2, '0')}:00:00Z`;
      
      data.push({
        timestamp: fullTimestamp,
        date: ts,
        point_id: `RP_${station.stn_code}`,
        stn_code: station.stn_code,
        monitoring_location: station.monitoring_location,
        // River point location (ON the river)
        latitude: station.river_lat,
        longitude: station.river_lon,
        // Pollution data for coloring
        severity_score: parseFloat(severity.toFixed(2)),
        pollution_category: category,
        alert_level: alertLevel
      });
    });
  });
  
  return data;
}

const municipalStationData = generateMunicipalStationData();
const riverMonitoringPointsData = generateRiverMonitoringPointsData();

/**
 * Suspect Links Data - Industrial sources near Yamuna River, Delhi
 * Using PCB license format with locations near river-network.json path
 */
const suspectLinksData = [
  // Near Wazirabad - Shahdara Industrial Area
  { 
    source_lat: 28.6591811, 
    source_lon: 77.2582841, 
    target_lat: 28.6640, 
    target_lon: 77.2650, 
    license_id: 'PCB/DEL/2021/45846',
    company_name: 'Shahdara Rubber Industries Pvt Ltd',
    industry_type: 'Rubber Manufacturing',
    location_hint: 'Shahdara Industrial Area, Near Yamuna River',
    station_code_ref: '2057',
    state: 'DELHI',
    status: 'EXPIRED',
    valid_upto: '31/03/2022',
    authorized_limits: {
      max_discharge_kld: 50,
      primary_pollutant: 'Sulfur Compounds'
    },
    geolocation: { lat: 28.6640, lon: 77.2650 },
    compliance_history: {
      last_inspection: '12/04/2022',
      bank_guarantee_amt: '10,00,000'
    },
    distance_upstream_m: 380, 
    suspicion_score: 0.82,
    evidence: 'Sulfur compounds detected in downstream water samples.',
    historical_violations: 4,
    sentinel_images: []
  },
  // Near Old Railway Bridge - Textile Dyeing
  { 
    source_lat: 28.6521342, 
    source_lon: 77.2626936, 
    target_lat: 28.6580, 
    target_lon: 77.2700, 
    license_id: 'PCB/DEL/2021/52009',
    company_name: 'Sadar Bazaar Textile Cluster',
    industry_type: 'Textile Dyeing',
    location_hint: 'Sadar Bazaar Industrial Area',
    station_code_ref: '2058',
    state: 'DELHI',
    status: 'NA',
    valid_upto: '',
    authorized_limits: {
      max_discharge_kld: 0,
      primary_pollutant: 'Dyes and Chemicals'
    },
    geolocation: { lat: 28.6580, lon: 77.2700 },
    compliance_history: {
      last_inspection: '20/06/2023',
      bank_guarantee_amt: '0'
    },
    distance_upstream_m: 420, 
    suspicion_score: 0.75,
    evidence: 'Multiple small-scale dyeing units operating without permits.',
    historical_violations: 0,
    sentinel_images: []
  },
  // Near ITO - Industrial Effluent
  { 
    source_lat: 28.6015255, 
    source_lon: 77.2608054, 
    target_lat: 28.6050, 
    target_lon: 77.2680, 
    license_id: 'PCB/DEL/2021/55853',
    company_name: 'Apex Dyeing Works Pvt Ltd',
    industry_type: 'Textile Industry',
    location_hint: 'Near ITO Industrial Complex',
    station_code_ref: '2059',
    state: 'DELHI',
    status: 'EXPIRED',
    valid_upto: '30/11/2022',
    authorized_limits: {
      max_discharge_kld: 100,
      primary_pollutant: 'Heavy Metals'
    },
    geolocation: { lat: 28.6050, lon: 77.2680 },
    compliance_history: {
      last_inspection: '20/11/2022',
      bank_guarantee_amt: '15,00,000'
    },
    distance_upstream_m: 450, 
    suspicion_score: 0.92,
    evidence: 'High Conductivity matches industrial effluent profile.',
    historical_violations: 3,
    sentinel_images: []
  },
  // Near Nizamuddin - Power Plant Discharge
  { 
    source_lat: 28.5861798, 
    source_lon: 77.2813296, 
    target_lat: 28.5920, 
    target_lon: 77.2880, 
    license_id: 'PCB/DEL/2023/62447',
    company_name: 'Badarpur Thermal Power Station',
    industry_type: 'Power Generation',
    location_hint: 'Badarpur NTPC Complex',
    station_code_ref: '2060',
    state: 'DELHI',
    status: 'ACTIVE',
    valid_upto: '31/12/2025',
    authorized_limits: {
      max_discharge_kld: 5000,
      primary_pollutant: 'Thermal Discharge'
    },
    geolocation: { lat: 28.5920, lon: 77.2880 },
    compliance_history: {
      last_inspection: '10/02/2024',
      bank_guarantee_amt: '50,00,000'
    },
    distance_upstream_m: 680, 
    suspicion_score: 0.78,
    evidence: 'Thermal discharge confirmed - elevated water temperature downstream.',
    historical_violations: 2,
    sentinel_images: []
  },
  // Near Okhla - Leather Tanning
  { 
    source_lat: 28.5444696, 
    source_lon: 77.3149162, 
    target_lat: 28.5500, 
    target_lon: 77.3220, 
    license_id: 'PCB/DEL/2020/81397',
    company_name: 'Metro Leather Works',
    industry_type: 'Leather Tanning',
    location_hint: 'Okhla Industrial Area Phase II',
    station_code_ref: '2061',
    state: 'DELHI',
    status: 'EXPIRED',
    valid_upto: '31/05/2021',
    authorized_limits: {
      max_discharge_kld: 75,
      primary_pollutant: 'Chromium'
    },
    geolocation: { lat: 28.5500, lon: 77.3220 },
    compliance_history: {
      last_inspection: '22/05/2021',
      bank_guarantee_amt: '20,00,000'
    },
    distance_upstream_m: 520, 
    suspicion_score: 0.88,
    evidence: 'Chromium levels elevated - leather tanning effluent suspected.',
    historical_violations: 5,
    sentinel_images: []
  },
  // Near Okhla - Sewage Treatment Plant
  { 
    source_lat: 28.5444696, 
    source_lon: 77.3149162, 
    target_lat: 28.5470, 
    target_lon: 77.3180, 
    license_id: 'PCB/DEL/2023/83706',
    company_name: 'Okhla Sewage Treatment Plant',
    industry_type: 'Sewage Treatment Plant',
    location_hint: 'Okhla STP Complex',
    station_code_ref: '2061',
    state: 'DELHI',
    status: 'ACTIVE',
    valid_upto: '31/12/2026',
    authorized_limits: {
      max_discharge_kld: 640000,
      primary_pollutant: 'Organic Matter'
    },
    geolocation: { lat: 28.5470, lon: 77.3180 },
    compliance_history: {
      last_inspection: '01/03/2024',
      bank_guarantee_amt: '1,00,00,000'
    },
    distance_upstream_m: 180, 
    suspicion_score: 0.52,
    evidence: 'Treatment capacity exceeded during monsoon - overflow suspected.',
    historical_violations: 2,
    sentinel_images: []
  },
  // Near Kalindi Kunj - Chemical Industries
  { 
    source_lat: 28.5315889, 
    source_lon: 77.3309392, 
    target_lat: 28.5380, 
    target_lon: 77.3380, 
    license_id: 'PCB/DEL/2020/87388',
    company_name: 'Kalindi Chemical Industries Cluster',
    industry_type: 'Chemical Manufacturing',
    location_hint: 'Kalindi Industrial Estate',
    station_code_ref: '2062',
    state: 'DELHI',
    status: 'EXPIRED',
    valid_upto: '15/09/2021',
    authorized_limits: {
      max_discharge_kld: 200,
      primary_pollutant: 'Heavy Metals'
    },
    geolocation: { lat: 28.5380, lon: 77.3380 },
    compliance_history: {
      last_inspection: '15/09/2021',
      bank_guarantee_amt: '25,00,000'
    },
    distance_upstream_m: 350, 
    suspicion_score: 0.85,
    evidence: 'Heavy metals detected in effluent samples.',
    historical_violations: 6,
    sentinel_images: []
  },
];

// Dataset export functions
export function getRiverNetworkDataset() {
  return { info: { id: 'river_network', label: 'Yamuna River Network' }, data: riverNetworkData };
}

export function getPollutionSegmentsDataset() {
  return {
    info: { id: 'pollution_segments', label: 'Pollution Segments' },
    data: {
      fields: [
        { name: 'timestamp', type: 'timestamp', format: 'YYYY-MM-DDTHH:mm:ssZ' },
        { name: 'date', type: 'string' },
        { name: 'segment_id', type: 'string' },
        { name: 'stn_code', type: 'string' },
        { name: 'monitoring_location', type: 'string' },
        { name: 'type_water_body', type: 'string' },
        { name: 'state_name', type: 'string' },
        { name: 'start_lat', type: 'real' },
        { name: 'start_lon', type: 'real' },
        { name: 'end_lat', type: 'real' },
        { name: 'end_lon', type: 'real' },
        { name: 'geometry', type: 'geojson' },
        { name: 'severity_score', type: 'real' },
        { name: 'pollution_category', type: 'string' },
        // CPCB water quality parameters
        { name: 'temperature_c', type: 'real' },
        { name: 'dissolved_oxygen_mg_l', type: 'real' },
        { name: 'ph', type: 'real' },
        { name: 'conductivity_umho_cm', type: 'integer' },
        { name: 'bod_mg_l', type: 'real' },
        { name: 'nitrate_n_mg_l', type: 'real' },
        { name: 'fecal_coliform_mpn', type: 'integer' },
        { name: 'total_coliform_mpn', type: 'integer' }
      ],
      rows: pollutionSegmentData.map(row => [
        row.timestamp, row.date, row.segment_id, row.stn_code,
        row.monitoring_location, row.type_water_body, row.state_name,
        row.start_lat, row.start_lon, row.end_lat, row.end_lon,
        row.geometry, row.severity_score, row.pollution_category,
        row.temperature_c, row.dissolved_oxygen_mg_l, row.ph,
        row.conductivity_umho_cm, row.bod_mg_l, row.nitrate_n_mg_l,
        row.fecal_coliform_mpn, row.total_coliform_mpn
      ])
    }
  };
}

export function getMunicipalStationsDataset() {
  return {
    info: { id: 'municipal_stations', label: 'Water Quality Monitoring Stations' },
    data: {
      fields: [
        { name: 'timestamp', type: 'timestamp', format: 'YYYY-MM-DDTHH:mm:ssZ' },
        { name: 'date', type: 'string' },
        { name: 'stn_code', type: 'string' },
        { name: 'monitoring_location', type: 'string' },
        { name: 'type_water_body', type: 'string' },
        { name: 'state_name', type: 'string' },
        { name: 'latitude', type: 'real' },
        { name: 'longitude', type: 'real' },
        { name: 'distance_to_river_m', type: 'integer' },
        { name: 'severity_score', type: 'real' },
        { name: 'pollution_category', type: 'string' },
        { name: 'is_anomaly', type: 'boolean' },
        { name: 'alert_level', type: 'string' },
        // CPCB water quality parameters
        { name: 'temperature_c', type: 'real' },
        { name: 'dissolved_oxygen_mg_l', type: 'real' },
        { name: 'ph', type: 'real' },
        { name: 'conductivity_umho_cm', type: 'integer' },
        { name: 'bod_mg_l', type: 'real' },
        { name: 'nitrate_n_mg_l', type: 'real' },
        { name: 'fecal_coliform_mpn', type: 'integer' },
        { name: 'total_coliform_mpn', type: 'integer' },
        // Sentinel satellite images for this station
        { name: 'sentinel_images', type: 'string' }
      ],
      rows: municipalStationData.map(row => [
        row.timestamp, row.date, row.stn_code, row.monitoring_location,
        row.type_water_body, row.state_name, row.latitude, row.longitude,
        row.distance_to_river_m, row.severity_score, row.pollution_category,
        row.is_anomaly, row.alert_level,
        row.temperature_c, row.dissolved_oxygen_mg_l, row.ph,
        row.conductivity_umho_cm, row.bod_mg_l, row.nitrate_n_mg_l,
        row.fecal_coliform_mpn, row.total_coliform_mpn,
        JSON.stringify(row.sentinel_images || [])
      ])
    }
  };
}

export function getRiverMonitoringPointsDataset() {
  return {
    info: { id: 'river_monitoring_points', label: 'River Monitoring Points' },
    data: {
      fields: [
        { name: 'timestamp', type: 'timestamp', format: 'YYYY-MM-DDTHH:mm:ssZ' },
        { name: 'date', type: 'string' },
        { name: 'point_id', type: 'string' },
        { name: 'stn_code', type: 'string' },
        { name: 'monitoring_location', type: 'string' },
        { name: 'latitude', type: 'real' },
        { name: 'longitude', type: 'real' },
        { name: 'severity_score', type: 'real' },
        { name: 'pollution_category', type: 'string' },
        { name: 'alert_level', type: 'string' }
      ],
      rows: riverMonitoringPointsData.map(row => [
        row.timestamp, row.date, row.point_id, row.stn_code,
        row.monitoring_location, row.latitude, row.longitude,
        row.severity_score, row.pollution_category, row.alert_level
      ])
    }
  };
}

export function getSuspectLinksDataset() {
  return {
    info: { id: 'suspect_links', label: 'Pollution Attribution' },
    data: {
      fields: [
        // Location fields
        { name: 'source_lat', type: 'real' },
        { name: 'source_lon', type: 'real' },
        { name: 'target_lat', type: 'real' },
        { name: 'target_lon', type: 'real' },
        // PCB license fields (aligned with Municipal Records metadata format)
        { name: 'license_id', type: 'string' },
        { name: 'company_name', type: 'string' },
        { name: 'industry_type', type: 'string' },
        { name: 'location_hint', type: 'string' },
        { name: 'station_code_ref', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'valid_upto', type: 'string' },
        { name: 'max_discharge_kld', type: 'integer' },
        { name: 'primary_pollutant', type: 'string' },
        { name: 'last_inspection', type: 'string' },
        { name: 'bank_guarantee_amt', type: 'string' },
        // Derived analysis fields
        { name: 'distance_upstream_m', type: 'integer' },
        { name: 'suspicion_score', type: 'real' },
        { name: 'evidence', type: 'string' },
        { name: 'historical_violations', type: 'integer' },
        // Satellite imagery references
        { name: 'sentinel_images', type: 'string' }
      ],
      rows: suspectLinksData.map(row => [
        row.source_lat, row.source_lon, row.target_lat, row.target_lon,
        row.license_id, row.company_name, row.industry_type, row.location_hint,
        row.station_code_ref, row.state, row.status, row.valid_upto,
        row.authorized_limits.max_discharge_kld, row.authorized_limits.primary_pollutant,
        row.compliance_history.last_inspection, row.compliance_history.bank_guarantee_amt,
        row.distance_upstream_m, row.suspicion_score, row.evidence,
        row.historical_violations, JSON.stringify(row.sentinel_images)
      ])
    }
  };
}

export function getKeplerConfig() {
  return keplerConfig;
}

/**
 * Get the time range for timeseries animation
 * Returns timestamps in milliseconds for use with setFilterAnimationTime
 */
export function getTimeseriesTimeRange() {
  // Extract unique timestamps from the pollution segment data
  const timestamps = pollutionSegmentData.map(d => new Date(d.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  
  return {
    min: minTime,
    max: maxTime,
    // Initial animation window - start from beginning
    initialValue: [minTime, minTime + (maxTime - minTime) * 0.1]
  };
}

export function loadAllSampleData() {
  // Use the imported kepler config which has proper filter settings
  return {
    datasets: [
      getPollutionSegmentsDataset(),
      getMunicipalStationsDataset(),
      getRiverMonitoringPointsDataset(),
      getSuspectLinksDataset()
    ],
    config: keplerConfig,
    options: { autoCreateLayers: false, centerMap: false }
  };
}


export const POLLUTION_CATEGORY_COLORS = {
  NORMAL: [34, 197, 94],
  AGRICULTURAL_RUNOFF: [132, 204, 22],
  SEWAGE_ORGANIC: [250, 204, 21],
  INDUSTRIAL_CHEMICAL: [239, 68, 68],
  CRITICAL: [220, 38, 38]
};

export const ALERT_LEVEL_COLORS = {
  GREEN: [34, 197, 94],
  YELLOW: [250, 204, 21],
  ORANGE: [249, 115, 22],
  RED: [239, 68, 68]
};

export default {
  loadAllSampleData,
  getRiverNetworkDataset,
  getPollutionSegmentsDataset,
  getMunicipalStationsDataset,
  getRiverMonitoringPointsDataset,
  getSuspectLinksDataset,
  getKeplerConfig,
  getTimeseriesTimeRange,
  POLLUTION_CATEGORY_COLORS,
  ALERT_LEVEL_COLORS
};
