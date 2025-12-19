// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import {MapLib, MapRef} from 'react-map-gl';

import {JALRAKSHAK_UNFOLDED_BUCKET} from '@jalrakshak/constants';
import type {BaseMapLibraryType} from '@jalrakshak/constants';

import type {DatabaseAdapter} from './application-config-types';

export type MapLibInstance = MapLib<any>;
export type GetMapRef = ReturnType<MapRef['getMap']>;

export type BaseMapLibraryConfig = {
  getMapLib: () => Promise<MapLibInstance>;
  mapLibAttributionCssClass: string;
  mapLibCssClass: string;
  mapLibName: string;
  mapLibUrl: string;
};

/**
 * A mechanism to override default Jalrakshak values/settings so that we
 * without having to make application-specific changes to the jalrakshak repo.
 */
export type JalrakshakApplicationConfig = {
  /** Default name of export HTML file, can be overridden by user */
  defaultHtmlName?: string;
  defaultImageName?: string;
  defaultJsonName?: string;
  defaultDataName?: string;
  defaultExportJsonSettings?: {
    hasData?: boolean;
  };
  baseMapLibraryConfig?: Record<BaseMapLibraryType, BaseMapLibraryConfig>;
  plugins?: any[];
  // JalrakshakTable alternative
  // TODO improve typing by exporting JalrakshakTable interface to @jalrakshak/types
  table?: any;
  database?: DatabaseAdapter | null;

  // Disable progressive loading for arrow files
  useArrowProgressiveLoading?: boolean;
  // Show built-in banner associated with the current version of Jalrakshak.gl
  showReleaseBanner?: boolean;
  // Use the onFilteredItemsChange callback for DataFilterExtension.
  // Enabling this option may cause performance issues when dealing with a large number of layers or sublayers,
  // especially if large Arrow files are split into relatively small batches (should be fixed in the future).
  useOnFilteredItemsChange?: boolean;

  // A URL to the CDN where the jalrakshak assets are hosted.
  cdnUrl?: string;

  // Raster Tile layer config
  // Raster Tile layer is under development and not ready for production use. Disabled by default.
  enableRasterTileLayer?: boolean;
  /** Whether to use Titiler v0.21 API endpoints instead of v0.11 */
  rasterServerUseLatestTitiler?: boolean;
  /** An array of URLs to shards of the raster tile server to be used by the raster tile layer. */
  rasterServerUrls?: string[];
  /** If true then try to fetch quantized elevation meshes from raster servers */
  rasterServerSupportsElevation?: boolean;
  /** How many times to retry a request if case of rasterServerServerErrorsToRetry errors */
  rasterServerMaxRetries?: number;
  /** How long between retries */
  rasterServerRetryDelay?: number;
  /** An array of HTTP status codes that should be retried when encountered. */
  rasterServerServerErrorsToRetry?: number[];
  /** Maximum number of simultaneous requests per raster server. 0 - no limit */
  rasterServerMaxPerServerRequests?: number;
  /** Whether to show the server input field in the raster tile layer setup form */
  rasterServerShowServerInput?: boolean;

  // WMS layer config -- Experimental
  // WMS layer is under development and not ready for production use. Disabled by default.
  enableWMSLayer?: boolean;
};

const DEFAULT_APPLICATION_CONFIG: Required<JalrakshakApplicationConfig> = {
  defaultHtmlName: 'jalrakshak.html',
  defaultImageName: 'jalrakshak.png',
  defaultJsonName: 'jalrakshak.json',
  defaultDataName: 'jalrakshak',
  defaultExportJsonSettings: {
    hasData: true
  },

  baseMapLibraryConfig: {
    maplibre: {
      getMapLib: () => import('maplibre-gl'),
      mapLibCssClass: 'maplibregl',
      mapLibAttributionCssClass: 'maplibre-attribution-container',
      mapLibName: 'MapLibre',
      mapLibUrl: 'https://www.maplibre.org/'
    },
    mapbox: {
      getMapLib: () => import('mapbox-gl'),
      mapLibCssClass: 'mapboxgl',
      mapLibAttributionCssClass: 'mapbox-attribution-container',
      mapLibName: 'Mapbox',
      mapLibUrl: 'https://www.mapbox.com/'
    }
  },

  cdnUrl: JALRAKSHAK_UNFOLDED_BUCKET,

  plugins: [],
  // The default table class is JalrakshakTable.
  // TODO include JalrakshakTable here when the circular dependency with @jalrakshak/table and @jalrakshak/utils are resolved.
  table: null,
  database: null,

  useArrowProgressiveLoading: true,
  showReleaseBanner: true,
  useOnFilteredItemsChange: false,

  // Raster Tile layer config
  enableRasterTileLayer: true,
  rasterServerUseLatestTitiler: true,
  rasterServerShowServerInput: true,
  rasterServerUrls: [], // TODO: provide a default free server or leave blank
  rasterServerSupportsElevation: true,
  rasterServerMaxRetries: 1,
  rasterServerRetryDelay: 10000,
  rasterServerServerErrorsToRetry: [503],
  rasterServerMaxPerServerRequests: 0,

  // WMS layer config
  enableWMSLayer: true
};

const applicationConfig: Required<JalrakshakApplicationConfig> = DEFAULT_APPLICATION_CONFIG;

export const getApplicationConfig = (): Required<JalrakshakApplicationConfig> => applicationConfig;

export function initApplicationConfig(appConfig: JalrakshakApplicationConfig = {}) {
  Object.assign(applicationConfig, appConfig);
}
