// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React from 'react';



import { PanelLabel, SidePanelSection } from '../../common/styled-components';
import SourceDataSelectorContentFactory from './source-data-selector-content';
import { SourceDataSelectorProps } from './types';
import {FormattedMessage} from 'react-intl';


SourceDataSelectorFactory.deps = [SourceDataSelectorContentFactory];

export default function SourceDataSelectorFactory(
  DataSourceSelectorContent: ReturnType<typeof SourceDataSelectorContentFactory>
): React.FC<SourceDataSelectorProps> {
  const SourceDataSelector: React.FC<SourceDataSelectorProps> = React.memo(
    ({
      dataId,
      datasets,
      disabled,
      onSelect,
      defaultValue = 'Select A Dataset',
      inputTheme
    }: SourceDataSelectorProps) => (
      <SidePanelSection className="data-source-selector">
        <PanelLabel>
          <FormattedMessage id={'misc.dataSource'} />
        </PanelLabel>
        <DataSourceSelectorContent
          inputTheme={inputTheme}
          datasets={datasets}
          dataId={dataId}
          onSelect={onSelect}
          defaultValue={defaultValue}
          disabled={disabled}
        />
      </SidePanelSection>
    )
  );

  SourceDataSelector.displayName = 'SourceDataSelector';
  return SourceDataSelector;
}
