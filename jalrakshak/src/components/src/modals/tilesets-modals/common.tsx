// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import type { WMSCapabilities } from '@loaders.gl/wms';

import type { VectorTileMetadata } from '@jalrakshak/table';
import type { StacTypes } from '@jalrakshak/types';

export type DatasetCreationAttributes = {
  name: string;
  type: string;
  metadata: Record<string, any>;
};

export type MetaResponse = {
  metadata?: VectorTileMetadata | StacTypes.CompleteSTACObject | WMSCapabilities | null;
  dataset?: DatasetCreationAttributes | null;
  loading?: boolean;
  error?: Error | null;
};
