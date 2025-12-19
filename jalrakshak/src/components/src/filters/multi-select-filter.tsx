// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React from 'react';
import ItemSelector from '../common/item-selector/item-selector';
import { PanelLabel } from '../common/styled-components';

import { MultiSelectFilterProps } from './types';
import {FormattedMessage} from 'react-intl';


export default function MultiSelectFilterFactory() {
  const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({ filter, setFilter }) => (
    <div>
      <PanelLabel htmlFor={`filter-${filter.id}`}>
        <FormattedMessage id={'misc.valuesIn'} />
      </PanelLabel>
      <ItemSelector options={filter.domain} selectedItems={filter.value} onChange={setFilter} />
    </div>
  );
  return MultiSelectFilter;
}
