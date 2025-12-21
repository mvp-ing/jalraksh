/**
 * API Configuration for Inspector Mode
 *
 * This file centralizes API configuration to avoid browser-incompatible
 * process.env references which don't work with esbuild/Vite.
 */

/**
 * Base URL for the Inspector Mode API
 * Change this when deploying to production
 */
export const INSPECTOR_API_BASE_URL = 'http://localhost:8000/api';

/**
 * API request timeout in milliseconds
 */
export const API_TIMEOUT = 30000;

/**
 * Retry configuration for failed requests
 */
export const API_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
};
