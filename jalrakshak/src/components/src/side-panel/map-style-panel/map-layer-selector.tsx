// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React from 'react';
import styled from 'styled-components';
import PanelHeaderActionFactory from '../panel-header-action';
import LayerGroupItemFactory, { LayerGroupItemActionIcons } from './map-layer-group-item';
import { EyeSeen, EyeUnseen } from '../../common/icons';

import { PanelLabel, PanelContent } from '../../common/styled-components';

import { VisibleLayerGroups } from '@jalrakshak/types';
import { Upload } from '@jalrakshak/cloud-providers';
import {
  THREE_D_BUILDING_LAYER_GROUP_SLUG,
  BACKGROUND_LAYER_GROUP_SLUG,
  DEFAULT_LAYER_GROUP
} from '@jalrakshak/constants';
import {
  MapConfigChangeUpdaterAction,
  Set3dBuildingColorUpdaterAction,
  SetBackgroundColorUpdaterAction
} from '@jalrakshak/actions';
import { MapStyle } from '@jalrakshak/reducers';
import {FormattedMessage} from 'react-intl';


function noop() {
  return;
}

const StyledInteractionPanel = styled.div`
  padding-bottom: 12px;
`;

export type LayerGroupSelectorProps = {
  layers: VisibleLayerGroups;
  editableLayers: DEFAULT_LAYER_GROUP[];
  onChange: (payload: MapConfigChangeUpdaterAction['payload']) => void;
  topLayers: MapStyle['topLayerGroups'];
  threeDBuildingColor: MapStyle['threeDBuildingColor'];
  on3dBuildingColorChange: (pd: Set3dBuildingColorUpdaterAction['payload']) => void;
  backgroundColor: MapStyle['backgroundColor'];
  onBackgroundColorChange: (pd: SetBackgroundColorUpdaterAction['payload']) => void;
  actionIcons?: LayerGroupItemActionIcons;
};

LayerGroupSelectorFactory.deps = [PanelHeaderActionFactory, LayerGroupItemFactory];

function LayerGroupSelectorFactory(
  PanelHeaderAction: ReturnType<typeof PanelHeaderActionFactory>,
  LayerGroupItem: ReturnType<typeof LayerGroupItemFactory>
) {
  const defaultActionIcons: LayerGroupItemActionIcons = {
    visible: EyeSeen,
    hidden: EyeUnseen,
    top: Upload
  };
  const LayerGroupSelector = ({
    layers,
    editableLayers,
    onChange,
    topLayers,
    threeDBuildingColor,
    on3dBuildingColorChange,
    backgroundColor,
    onBackgroundColorChange,
    actionIcons = defaultActionIcons
  }: LayerGroupSelectorProps) => {
    return (
      <StyledInteractionPanel className="map-style__layer-group__selector">
        <div className="layer-group__header">
          <PanelLabel>
            <FormattedMessage id={'mapLayers.title'} />
          </PanelLabel>
        </div>
        <PanelContent className="map-style__layer-group">
          {editableLayers.map(
            ({ slug, isVisibilityToggleAvailable, isMoveToTopAvailable, isColorPickerAvailable }) => (
              <LayerGroupItem
                key={slug}
                PanelHeaderAction={PanelHeaderAction}
                onChange={onChange}
                slug={slug}
                layers={layers}
                topLayers={topLayers}
                actionIcons={actionIcons}
                isVisibilityToggleAvailable={isVisibilityToggleAvailable}
                isMoveToTopAvailable={isMoveToTopAvailable}
                isColorPickerAvailable={isColorPickerAvailable}
                color={
                  isColorPickerAvailable && slug === THREE_D_BUILDING_LAYER_GROUP_SLUG
                    ? threeDBuildingColor
                    : slug === BACKGROUND_LAYER_GROUP_SLUG
                      ? backgroundColor
                      : null
                }
                onColorChange={
                  isColorPickerAvailable && slug === THREE_D_BUILDING_LAYER_GROUP_SLUG
                    ? on3dBuildingColorChange
                    : slug === BACKGROUND_LAYER_GROUP_SLUG
                      ? onBackgroundColorChange
                      : noop
                }
              />
            )
          )}
        </PanelContent>
      </StyledInteractionPanel>
    );
  };

  return LayerGroupSelector;
}

export default LayerGroupSelectorFactory;
