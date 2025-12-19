// SPDX-License-Identifier: MIT
// Copyright Jalraksh



export const MISSING_MAPBOX_TOKEN =
  'Mapbox Token not valid. ' +
  '[Click here](https://github.com/jalrakshak/jalrakshak#mapboxapiaccesstoken-string-required)';

export const IMAGE_EXPORT_ERRORS = {
  dataUri: `[jalrakshak] Failed to create image from data uri.
  Copy the uri in the javascript console when reporting this bug.
  The uri is the string starts with "data:image/png"`,
  styleSheet: `[jalrakshak] Failed to fetch stylesheet when exporting image.
    This probably will not affect the map. It might affect the legend.
    The stylesheet failed to load is: `
};
