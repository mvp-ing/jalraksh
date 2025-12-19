// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React, {HTMLAttributes, PropsWithChildren} from 'react';
import {MapStyle} from '@jalrakshak/reducers';
import {Layer, LayerClassesType} from '@jalrakshak/layers';
import {Filter, InteractionConfig, UiState} from '@jalrakshak/types';

import {
  MapStyleActions,
  VisStateActions,
  MapStateActions,
  UIStateActions
} from '@jalrakshak/actions';
import {Datasets} from '@jalrakshak/table';

export type BaseComponentProps = PropsWithChildren<HTMLAttributes<unknown>>;

export type SidePanelItem = {
  id: string;
  label: string;
  iconComponent: React.ComponentType<any>;
  component: React.ComponentType<any>;
};

export type SidePanelProps = {
  appName: string;
  appWebsite: string;
  filters: Filter[];
  interactionConfig: InteractionConfig;
  layerBlending: string;
  overlayBlending?: string;
  layers: Layer[];
  layerClasses: LayerClassesType;
  layerOrder: string[];
  mapStyle: MapStyle;
  mapInfo: {title?: string; description?: string};
  width: number;
  datasets: Datasets;
  uiStateActions: typeof UIStateActions;
  visStateActions: typeof VisStateActions;
  mapStateActions: typeof MapStateActions;
  mapStyleActions: typeof MapStyleActions;
  uiState: UiState;
  availableProviders: {[k: string]: {hasShare?: boolean; hasStorage?: boolean}};
  mapSaved?: string | null;
  panels?: SidePanelItem[];
  onSaveMap?: () => void;
  version: string;
};
