// SPDX-License-Identifier: MIT
// Copyright Jalraksh

/**
 * Sample Data Module for Jalrakshak Pollution Monitoring Demo
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
 * Municipal monitoring stations - actual station locations on land
 * Station locations are offset ~3km from the river to show they're on land
 * The closest river point is calculated dynamically
 */
const stationLocations = [
  { id: 'STN_001', name: 'Wazirabad Barrage', station_lat: 28.6700, station_lon: 77.2050, cleanSeverity: 0.08, pollutedSeverity: 0.15 },
  { id: 'STN_002', name: 'Old Railway Bridge', station_lat: 28.6600, station_lon: 77.2280, cleanSeverity: 0.10, pollutedSeverity: 0.35 },
  { id: 'STN_003', name: 'ITO Bridge', station_lat: 28.6530, station_lon: 77.2320, cleanSeverity: 0.12, pollutedSeverity: 0.55 },
  { id: 'STN_004', name: 'Nizamuddin Bridge', station_lat: 28.6020, station_lon: 77.2300, cleanSeverity: 0.10, pollutedSeverity: 0.78 },
  { id: 'STN_005', name: 'Sarai Kale Khan', station_lat: 28.5870, station_lon: 77.2500, cleanSeverity: 0.12, pollutedSeverity: 0.88 },
  { id: 'STN_006', name: 'Okhla Barrage', station_lat: 28.5450, station_lon: 77.2850, cleanSeverity: 0.10, pollutedSeverity: 0.95 },
  { id: 'STN_007', name: 'Kalindi Kunj', station_lat: 28.5320, station_lon: 77.3000, cleanSeverity: 0.12, pollutedSeverity: 0.90 },
  { id: 'STN_008', name: 'Faridabad Border', station_lat: 28.4860, station_lon: 77.3280, cleanSeverity: 0.10, pollutedSeverity: 0.72 },
];

// Build sensor stations with calculated closest river points
const sensorStations = stationLocations.map(station => {
  const closest = findClosestRiverPoint(station.station_lat, station.station_lon);
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
 * Generate pollution segment data - LINE SEGMENTS between stations
 * Each segment gets the color/severity of the starting station
 * This maps municipal station sensor readings onto the actual river path
 */
function generatePollutionSegmentData() {
  const data = [];
  
  // 14 time steps across 7 days
  const timestamps = [
    // Day 1 - Clean
    { ts: '2024-01-01T00:00:00Z', phase: 0.00 },
    { ts: '2024-01-01T12:00:00Z', phase: 0.07 },
    // Day 2 - Still clean
    { ts: '2024-01-02T00:00:00Z', phase: 0.14 },
    { ts: '2024-01-02T12:00:00Z', phase: 0.21 },
    // Day 3 - Factories start polluting
    { ts: '2024-01-03T00:00:00Z', phase: 0.28 },
    { ts: '2024-01-03T12:00:00Z', phase: 0.35 },
    // Day 4 - Pollution increasing
    { ts: '2024-01-04T00:00:00Z', phase: 0.42 },
    { ts: '2024-01-04T12:00:00Z', phase: 0.50 },
    // Day 5 - Heavy pollution
    { ts: '2024-01-05T00:00:00Z', phase: 0.57 },
    { ts: '2024-01-05T12:00:00Z', phase: 0.64 },
    // Day 6 - Peak pollution
    { ts: '2024-01-06T00:00:00Z', phase: 0.71 },
    { ts: '2024-01-06T12:00:00Z', phase: 0.78 },
    // Day 7 - Maximum pollution
    { ts: '2024-01-07T00:00:00Z', phase: 0.85 },
    { ts: '2024-01-07T12:00:00Z', phase: 1.00 },
  ];
  
  timestamps.forEach(({ ts, phase }) => {
    // Create a segment from each station to the next
    for (let i = 0; i < sensorStations.length; i++) {
      const station = sensorStations[i];
      const severity = getSeverityForPhase(station, phase);
      const category = getPollutionCategory(severity);
      
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
      
      data.push({
        timestamp: ts,
        segment_id: `SEG_${station.id}`,
        segment_name: station.name,
        station_id: station.id,
        // Start point (river point for this station)
        start_lat: station.river_lat,
        start_lon: station.river_lon,
        // End point (river point for next station)
        end_lat: (i < sensorStations.length - 1) ? sensorStations[i + 1].river_lat : riverRouteCoordinates[riverRouteCoordinates.length - 1][1],
        end_lon: (i < sensorStations.length - 1) ? sensorStations[i + 1].river_lon : riverRouteCoordinates[riverRouteCoordinates.length - 1][0],
        // GeoJSON geometry for the line
        geometry: geometry,
        // Pollution metrics (same for entire segment from starting station)
        severity_score: parseFloat(severity.toFixed(3)),
        pollution_category: category,
        ph: parseFloat((7.5 - severity * 4.5).toFixed(1)),
        conductivity: Math.round(400 + severity * 3200),
        do_level: parseFloat((7.5 - severity * 7.0).toFixed(1)),
        turbidity: Math.round(10 + severity * 250)
      });
    }
  });
  
  return data;
}

const pollutionSegmentData = generatePollutionSegmentData();

/**
 * Municipal Station Data - station locations with all sensor readings
 * These are the actual monitoring station buildings near the river
 */
function generateMunicipalStationData() {
  const data = [];
  
  const timestamps = [
    { ts: '2024-01-01T00:00:00Z', phase: 0.00 },
    { ts: '2024-01-01T12:00:00Z', phase: 0.07 },
    { ts: '2024-01-02T00:00:00Z', phase: 0.14 },
    { ts: '2024-01-02T12:00:00Z', phase: 0.21 },
    { ts: '2024-01-03T00:00:00Z', phase: 0.28 },
    { ts: '2024-01-03T12:00:00Z', phase: 0.35 },
    { ts: '2024-01-04T00:00:00Z', phase: 0.42 },
    { ts: '2024-01-04T12:00:00Z', phase: 0.50 },
    { ts: '2024-01-05T00:00:00Z', phase: 0.57 },
    { ts: '2024-01-05T12:00:00Z', phase: 0.64 },
    { ts: '2024-01-06T00:00:00Z', phase: 0.71 },
    { ts: '2024-01-06T12:00:00Z', phase: 0.78 },
    { ts: '2024-01-07T00:00:00Z', phase: 0.85 },
    { ts: '2024-01-07T12:00:00Z', phase: 1.00 },
  ];
  
  timestamps.forEach(({ ts, phase }) => {
    sensorStations.forEach(station => {
      const severity = getSeverityForPhase(station, phase);
      const category = getPollutionCategory(severity);
      const isAnomaly = severity > 0.60;
      
      let alertLevel = 'GREEN';
      if (severity > 0.65) alertLevel = 'RED';
      else if (severity > 0.45) alertLevel = 'ORANGE';
      else if (severity > 0.25) alertLevel = 'YELLOW';
      
      data.push({
        timestamp: ts,
        station_id: station.id,
        station_name: station.name,
        // Municipal station location (near river bank)
        lat: station.station_lat,
        lon: station.station_lon,
        // Distance to river
        distance_to_river_m: station.distance_m,
        // All sensor readings
        severity_score: parseFloat(severity.toFixed(2)),
        pollution_category: category,
        is_anomaly: isAnomaly,
        alert_level: alertLevel,
        ph: parseFloat((7.5 - severity * 4.5).toFixed(1)),
        conductivity: Math.round(400 + severity * 3200),
        do_level: parseFloat((7.5 - severity * 7.0).toFixed(1)),
        turbidity: Math.round(10 + severity * 250),
        // Water temperature (simulated)
        water_temp: parseFloat((22 + severity * 8).toFixed(1)),
        // Dissolved oxygen percentage
        do_saturation: parseFloat((95 - severity * 60).toFixed(1))
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
    { ts: '2024-01-01T00:00:00Z', phase: 0.00 },
    { ts: '2024-01-01T12:00:00Z', phase: 0.07 },
    { ts: '2024-01-02T00:00:00Z', phase: 0.14 },
    { ts: '2024-01-02T12:00:00Z', phase: 0.21 },
    { ts: '2024-01-03T00:00:00Z', phase: 0.28 },
    { ts: '2024-01-03T12:00:00Z', phase: 0.35 },
    { ts: '2024-01-04T00:00:00Z', phase: 0.42 },
    { ts: '2024-01-04T12:00:00Z', phase: 0.50 },
    { ts: '2024-01-05T00:00:00Z', phase: 0.57 },
    { ts: '2024-01-05T12:00:00Z', phase: 0.64 },
    { ts: '2024-01-06T00:00:00Z', phase: 0.71 },
    { ts: '2024-01-06T12:00:00Z', phase: 0.78 },
    { ts: '2024-01-07T00:00:00Z', phase: 0.85 },
    { ts: '2024-01-07T12:00:00Z', phase: 1.00 },
  ];
  
  timestamps.forEach(({ ts, phase }) => {
    sensorStations.forEach(station => {
      const severity = getSeverityForPhase(station, phase);
      const category = getPollutionCategory(severity);
      
      let alertLevel = 'GREEN';
      if (severity > 0.65) alertLevel = 'RED';
      else if (severity > 0.45) alertLevel = 'ORANGE';
      else if (severity > 0.25) alertLevel = 'YELLOW';
      
      data.push({
        timestamp: ts,
        point_id: `RP_${station.id}`,
        station_name: station.name,
        // River point location (ON the river)
        lat: station.river_lat,
        lon: station.river_lon,
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
 * Suspect Links Data - factories that cause pollution
 */
const suspectLinksData = [
  { source_lat: 28.6591811, source_lon: 77.2582841, target_lat: 28.6640, target_lon: 77.2650, incident_id: 'INC-001', suspect_name: 'Shahdara Rubber Factory', suspect_type: 'Rubber Manufacturing', distance_upstream_m: 380, suspicion_score: 0.82, permit_status: 'EXPIRED', evidence: 'Sulfur compounds detected.', last_inspection: '2022-04-12', historical_violations: 4 },
  { source_lat: 28.6521342, source_lon: 77.2626936, target_lat: 28.6580, target_lon: 77.2700, incident_id: 'INC-002', suspect_name: 'Sadar Bazaar Textile Market', suspect_type: 'Textile Dyeing', distance_upstream_m: 420, suspicion_score: 0.75, permit_status: 'NA', evidence: 'Multiple dyeing units.', last_inspection: '2023-06-20', historical_violations: 0 },
  { source_lat: 28.6015255, source_lon: 77.2608054, target_lat: 28.6050, target_lon: 77.2680, incident_id: 'INC-003', suspect_name: 'Apex Dyeing Works Pvt Ltd', suspect_type: 'Textile Industry', distance_upstream_m: 450, suspicion_score: 0.92, permit_status: 'EXPIRED', evidence: 'High Conductivity matches effluent profile.', last_inspection: '2022-11-20', historical_violations: 3 },
  { source_lat: 28.5861798, source_lon: 77.2813296, target_lat: 28.5920, target_lon: 77.2880, incident_id: 'INC-004', suspect_name: 'Badarpur Power Station', suspect_type: 'Power Generation', distance_upstream_m: 680, suspicion_score: 0.78, permit_status: 'ACTIVE', evidence: 'Thermal discharge confirmed.', last_inspection: '2024-02-10', historical_violations: 2 },
  { source_lat: 28.5444696, source_lon: 77.3149162, target_lat: 28.5500, target_lon: 77.3220, incident_id: 'INC-005', suspect_name: 'Metro Leather Works', suspect_type: 'Leather Tanning', distance_upstream_m: 520, suspicion_score: 0.88, permit_status: 'EXPIRED', evidence: 'Chromium levels elevated.', last_inspection: '2021-05-22', historical_violations: 5 },
  { source_lat: 28.5444696, source_lon: 77.3149162, target_lat: 28.5470, target_lon: 77.3180, incident_id: 'INC-006', suspect_name: 'Okhla STP Outfall', suspect_type: 'Sewage Treatment Plant', distance_upstream_m: 180, suspicion_score: 0.52, permit_status: 'ACTIVE', evidence: 'Treatment capacity exceeded.', last_inspection: '2024-03-01', historical_violations: 2 },
  { source_lat: 28.5315889, source_lon: 77.3309392, target_lat: 28.5380, target_lon: 77.3380, incident_id: 'INC-007', suspect_name: 'Kalindi Industrial Estate', suspect_type: 'Chemical Manufacturing', distance_upstream_m: 350, suspicion_score: 0.85, permit_status: 'EXPIRED', evidence: 'Heavy metals in effluent.', last_inspection: '2021-09-15', historical_violations: 6 },
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
        { name: 'segment_id', type: 'string' },
        { name: 'segment_name', type: 'string' },
        { name: 'station_id', type: 'string' },
        { name: 'start_lat', type: 'real' },
        { name: 'start_lon', type: 'real' },
        { name: 'end_lat', type: 'real' },
        { name: 'end_lon', type: 'real' },
        { name: 'geometry', type: 'geojson' },
        { name: 'severity_score', type: 'real' },
        { name: 'pollution_category', type: 'string' },
        { name: 'ph', type: 'real' },
        { name: 'conductivity', type: 'integer' },
        { name: 'do_level', type: 'real' },
        { name: 'turbidity', type: 'integer' }
      ],
      rows: pollutionSegmentData.map(row => [
        row.timestamp, row.segment_id, row.segment_name, row.station_id,
        row.start_lat, row.start_lon, row.end_lat, row.end_lon,
        row.geometry, row.severity_score, row.pollution_category,
        row.ph, row.conductivity, row.do_level, row.turbidity
      ])
    }
  };
}

export function getMunicipalStationsDataset() {
  return {
    info: { id: 'municipal_stations', label: 'Municipal Monitoring Stations' },
    data: {
      fields: [
        { name: 'timestamp', type: 'timestamp', format: 'YYYY-MM-DDTHH:mm:ssZ' },
        { name: 'station_id', type: 'string' },
        { name: 'station_name', type: 'string' },
        { name: 'lat', type: 'real' },
        { name: 'lon', type: 'real' },
        { name: 'distance_to_river_m', type: 'integer' },
        { name: 'severity_score', type: 'real' },
        { name: 'pollution_category', type: 'string' },
        { name: 'is_anomaly', type: 'boolean' },
        { name: 'alert_level', type: 'string' },
        { name: 'ph', type: 'real' },
        { name: 'conductivity', type: 'integer' },
        { name: 'do_level', type: 'real' },
        { name: 'turbidity', type: 'integer' },
        { name: 'water_temp', type: 'real' },
        { name: 'do_saturation', type: 'real' }
      ],
      rows: municipalStationData.map(row => [
        row.timestamp, row.station_id, row.station_name, row.lat, row.lon,
        row.distance_to_river_m, row.severity_score, row.pollution_category,
        row.is_anomaly, row.alert_level, row.ph, row.conductivity,
        row.do_level, row.turbidity, row.water_temp, row.do_saturation
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
        { name: 'point_id', type: 'string' },
        { name: 'station_name', type: 'string' },
        { name: 'lat', type: 'real' },
        { name: 'lon', type: 'real' },
        { name: 'severity_score', type: 'real' },
        { name: 'pollution_category', type: 'string' },
        { name: 'alert_level', type: 'string' }
      ],
      rows: riverMonitoringPointsData.map(row => [
        row.timestamp, row.point_id, row.station_name, row.lat, row.lon,
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
        { name: 'source_lat', type: 'real' },
        { name: 'source_lon', type: 'real' },
        { name: 'target_lat', type: 'real' },
        { name: 'target_lon', type: 'real' },
        { name: 'incident_id', type: 'string' },
        { name: 'suspect_name', type: 'string' },
        { name: 'suspect_type', type: 'string' },
        { name: 'distance_upstream_m', type: 'integer' },
        { name: 'suspicion_score', type: 'real' },
        { name: 'permit_status', type: 'string' },
        { name: 'evidence', type: 'string' },
        { name: 'last_inspection', type: 'string' },
        { name: 'historical_violations', type: 'integer' }
      ],
      rows: suspectLinksData.map(row => [
        row.source_lat, row.source_lon, row.target_lat, row.target_lon,
        row.incident_id, row.suspect_name, row.suspect_type, row.distance_upstream_m,
        row.suspicion_score, row.permit_status, row.evidence, row.last_inspection,
        row.historical_violations
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
