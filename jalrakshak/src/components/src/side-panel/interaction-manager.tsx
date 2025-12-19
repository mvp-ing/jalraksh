// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React from 'react';
import { useIntl } from 'react-intl';

import { InteractionConfig } from '@jalrakshak/types';
import { VisStateActions } from '@jalrakshak/actions';
import { Datasets } from '@jalrakshak/table';

import InteractionPanelFactory from './interaction-panel/interaction-panel';
import PanelTitleFactory from './panel-title';

import { PanelMeta } from './common/types';

type InteractionManagerProps = {
  interactionConfig: InteractionConfig;
  datasets: Datasets;
  visStateActions: typeof VisStateActions;
  panelMetadata: PanelMeta;
};

InteractionManagerFactory.deps = [InteractionPanelFactory, PanelTitleFactory];

function InteractionManagerFactory(
  InteractionPanel: ReturnType<typeof InteractionPanelFactory>,
  PanelTitle: ReturnType<typeof PanelTitleFactory>
) {
  const InteractionManager: React.FC<InteractionManagerProps> = ({
    interactionConfig,
    datasets,
    visStateActions,
    panelMetadata
  }) => {
    const { interactionConfigChange: onConfigChange, setColumnDisplayFormat } = visStateActions;
    const intl = useIntl();
    return (
      <div className="interaction-manager">
        <PanelTitle
          className="interaction-manager-title"
          title={intl.formatMessage({ id: panelMetadata.label })}
        />
        {Object.keys(interactionConfig).map(key => (
          <InteractionPanel
            datasets={datasets}
            config={interactionConfig[key]}
            key={key}
            onConfigChange={onConfigChange}
            setColumnDisplayFormat={setColumnDisplayFormat}
          />
        ))}
      </div>
    );
  };

  return InteractionManager;
}

export default InteractionManagerFactory;
