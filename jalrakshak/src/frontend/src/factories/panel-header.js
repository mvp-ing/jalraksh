// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import {PanelHeaderFactory} from '@jalrakshak/components';

export function CustomPanelHeaderFactory(...deps) {
  const PanelHeader = PanelHeaderFactory(...deps);
  PanelHeader.defaultProps = {
    ...PanelHeader.defaultProps,
    // Remove all action items (export/share buttons)
    actionItems: []
  };
  return PanelHeader;
}

CustomPanelHeaderFactory.deps = PanelHeaderFactory.deps;

export function replacePanelHeader() {
  return [PanelHeaderFactory, CustomPanelHeaderFactory];
}
