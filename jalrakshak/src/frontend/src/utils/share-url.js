// SPDX-License-Identifier: MIT
// Copyright Jalraksh

/**
 * Share URL Utilities
 * 
 * Provides functionality to encode/decode Kepler.gl visualization state
 * into shareable URLs with compressed config and segment IDs.
 * 
 * URL Format: https://app.com/demo/map?share=<base64-compressed-config>
 * 
 * The share payload contains:
 * - v: version number for future compatibility
 * - seg: segment ID (e.g., "SEG_STN_003" for ITO Bridge)
 * - ts: timestamp for the visualization
 * - map: map state (lat, lng, zoom, bearing, pitch)
 * - vis: visualization state (layers, filters, etc.)
 * - layers: layer visibility array
 */

import pako from 'pako';

// Share URL version - increment when payload structure changes
const SHARE_VERSION = 1;

/**
 * Segment ID to human-readable name mapping
 */
export const SEGMENT_NAMES = {
  'SEG_STN_001': 'Wazirabad Barrage',
  'SEG_STN_002': 'Old Railway Bridge',
  'SEG_STN_003': 'ITO Bridge',
  'SEG_STN_004': 'Nizamuddin Bridge',
  'SEG_STN_005': 'Sarai Kale Khan',
  'SEG_STN_006': 'Okhla Barrage',
  'SEG_STN_007': 'Kalindi Kunj',
  'SEG_STN_008': 'Faridabad Border',
};

/**
 * Get segment coordinates for centering map
 */
export const SEGMENT_COORDINATES = {
  'SEG_STN_001': { lat: 28.6689, lng: 77.2358, zoom: 14 },
  'SEG_STN_002': { lat: 28.6600, lng: 77.2380, zoom: 14 },
  'SEG_STN_003': { lat: 28.6520, lng: 77.2627, zoom: 14 },
  'SEG_STN_004': { lat: 28.6015, lng: 77.2608, zoom: 14 },
  'SEG_STN_005': { lat: 28.5862, lng: 77.2813, zoom: 14 },
  'SEG_STN_006': { lat: 28.5445, lng: 77.3149, zoom: 14 },
  'SEG_STN_007': { lat: 28.5316, lng: 77.3309, zoom: 14 },
  'SEG_STN_008': { lat: 28.4721, lng: 77.4180, zoom: 14 },
};

/**
 * Compresses and encodes data to a URL-safe Base64 string
 * @param {object} data - The data object to encode
 * @returns {string} URL-safe Base64 encoded string
 */
function compressAndEncode(data) {
  try {
    // Convert to JSON string
    const jsonString = JSON.stringify(data);
    
    // Compress using deflate (pako)
    const compressed = pako.deflate(jsonString, { level: 9 });
    
    // Convert to Base64
    const base64 = btoa(String.fromCharCode.apply(null, compressed));
    
    // Make URL-safe: replace + with -, / with _, remove trailing =
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    console.error('Failed to compress and encode share data:', error);
    throw new Error('Failed to create shareable link');
  }
}

/**
 * Decodes and decompresses a URL-safe Base64 string
 * @param {string} encoded - URL-safe Base64 encoded string
 * @returns {object} The decoded data object
 */
function decodeAndDecompress(encoded) {
  try {
    // Restore standard Base64 from URL-safe format
    let base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode Base64 to binary
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Decompress using inflate (pako)
    const decompressed = pako.inflate(bytes, { to: 'string' });
    
    // Parse JSON
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to decode and decompress share data:', error);
    throw new Error('Invalid or corrupted share link');
  }
}

/**
 * Generates a shareable URL for the current visualization state
 * 
 * @param {object} options - Options for generating the share URL
 * @param {object} options.keplerConfig - The Kepler.gl configuration object
 * @param {string} options.segmentId - The river segment ID (e.g., "SEG_STN_003")
 * @param {object} options.mapState - Current map state (latitude, longitude, zoom, etc.)
 * @param {string} [options.timestamp] - Optional timestamp for the visualization
 * @param {string[]} [options.visibleLayers] - Optional array of visible layer IDs
 * @returns {string} The complete shareable URL
 */
export function generateShareableLink({
  keplerConfig,
  segmentId,
  mapState,
  timestamp = null,
  visibleLayers = null,
}) {
  // Build minimal payload for smallest URL possible
  const shareData = {
    v: SHARE_VERSION,
    seg: segmentId || null,
  };
  
  // Add timestamp if provided
  if (timestamp) {
    shareData.ts = timestamp;
  }
  
  // Add map state (compact format)
  if (mapState) {
    shareData.map = {
      lat: parseFloat(mapState.latitude?.toFixed(6) || '28.58'),
      lng: parseFloat(mapState.longitude?.toFixed(6) || '77.29'),
      z: mapState.zoom || 11,
      b: mapState.bearing || 0,
      p: mapState.pitch || 45,
    };
  }
  
  // Add layer visibility if provided
  if (visibleLayers && visibleLayers.length > 0) {
    shareData.layers = visibleLayers;
  }
  
  // Add visualization state (layers config, filters) - only essential parts
  if (keplerConfig?.config?.visState) {
    const visState = keplerConfig.config.visState;
    shareData.vis = {
      // Store only layer visibility and configuration that affects rendering
      layerOrder: visState.layerOrder,
      // Store filter state for time animations
      filters: visState.filters?.map(f => ({
        id: f.id,
        dataId: f.dataId,
        name: f.name,
        type: f.type,
        value: f.value,
        enlarged: f.enlarged,
        isAnimating: f.isAnimating,
        animationWindow: f.animationWindow,
        speed: f.speed,
      })) || [],
      // Store animation config
      animationConfig: visState.animationConfig,
    };
  }
  
  // Compress and encode
  const encoded = compressAndEncode(shareData);
  
  // Build the full URL
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}`
    : '/demo/map';
  
  return `${baseUrl}?share=${encoded}`;
}

/**
 * Generates a lightweight share URL with just segment and basic info
 * (No Kepler config, much shorter URL)
 * 
 * @param {object} options - Options for generating the share URL
 * @param {string} options.segmentId - The river segment ID
 * @param {string} [options.timestamp] - Optional timestamp
 * @param {number} [options.zoom] - Optional zoom level
 * @returns {string} The shareable URL
 */
export function generateLightShareLink({
  segmentId,
  timestamp = null,
  zoom = 14,
}) {
  const params = new URLSearchParams();
  
  if (segmentId) {
    params.set('segment', segmentId);
  }
  
  if (timestamp) {
    params.set('ts', timestamp);
  }
  
  if (zoom && zoom !== 14) {
    params.set('zoom', zoom.toString());
  }
  
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/demo/map`
    : '/demo/map';
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Parses a share URL and extracts the visualization state
 * 
 * @param {string} [urlOrSearch] - The URL or search string to parse. 
 *                                  If not provided, uses window.location
 * @returns {object|null} The parsed share data, or null if not a share URL
 */
export function parseShareableLink(urlOrSearch = null) {
  try {
    let searchParams;
    
    if (urlOrSearch) {
      // Handle full URL or just search string
      if (urlOrSearch.includes('?')) {
        searchParams = new URLSearchParams(urlOrSearch.split('?')[1]);
      } else if (urlOrSearch.startsWith('?')) {
        searchParams = new URLSearchParams(urlOrSearch);
      } else {
        searchParams = new URLSearchParams(urlOrSearch);
      }
    } else if (typeof window !== 'undefined') {
      searchParams = new URLSearchParams(window.location.search);
    } else {
      return null;
    }
    
    // Check for compressed share parameter
    const encoded = searchParams.get('share');
    if (encoded) {
      const shareData = decodeAndDecompress(encoded);
      
      // Validate version
      if (shareData.v && shareData.v > SHARE_VERSION) {
        console.warn(`Share link version ${shareData.v} is newer than supported ${SHARE_VERSION}`);
      }
      
      // Expand compact map state
      if (shareData.map) {
        shareData.mapState = {
          latitude: shareData.map.lat,
          longitude: shareData.map.lng,
          zoom: shareData.map.z,
          bearing: shareData.map.b,
          pitch: shareData.map.p,
        };
        delete shareData.map;
      }
      
      // Add segment name if available
      if (shareData.seg && SEGMENT_NAMES[shareData.seg]) {
        shareData.segmentName = SEGMENT_NAMES[shareData.seg];
      }
      
      return shareData;
    }
    
    // Check for lightweight share parameters
    const segmentId = searchParams.get('segment');
    if (segmentId) {
      const coords = SEGMENT_COORDINATES[segmentId] || {};
      return {
        v: SHARE_VERSION,
        seg: segmentId,
        segmentName: SEGMENT_NAMES[segmentId] || segmentId,
        ts: searchParams.get('ts'),
        mapState: {
          latitude: coords.lat || 28.58,
          longitude: coords.lng || 77.29,
          zoom: parseInt(searchParams.get('zoom') || coords.zoom || '14', 10),
          bearing: 0,
          pitch: 45,
        },
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse share link:', error);
    return null;
  }
}

/**
 * Checks if the current URL is a share URL
 * @returns {boolean} True if current URL contains share parameters
 */
export function isShareUrl() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('share') || params.has('segment');
}

/**
 * Clears share parameters from the URL without reloading
 */
export function clearShareParams() {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete('share');
  url.searchParams.delete('segment');
  url.searchParams.delete('ts');
  url.searchParams.delete('zoom');
  
  window.history.replaceState({}, '', url.toString());
}

/**
 * Copies a shareable URL to the clipboard
 * @param {string} url - The URL to copy
 * @returns {Promise<boolean>} True if successfully copied
 */
export async function copyToClipboard(url) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

export default {
  generateShareableLink,
  generateLightShareLink,
  parseShareableLink,
  isShareUrl,
  clearShareParams,
  copyToClipboard,
  SEGMENT_NAMES,
  SEGMENT_COORDINATES,
};
