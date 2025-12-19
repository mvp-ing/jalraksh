// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React from 'react';
import styled from 'styled-components';
import DatasetLabel from '../common/dataset-label';

import { Layer } from '@jalrakshak/layers';
import { JalrakshakTable } from '@jalrakshak/table';
import {FormattedMessage} from 'react-intl';


const StyledMsg = styled.div`
  margin-top: 24px;
`;

export interface DeleteDatasetModalProps {
  dataset: JalrakshakTable;
  layers: Layer[];
}

export const DeleteDatasetModal: React.FC<DeleteDatasetModalProps> = ({ dataset, layers = [] }) => {
  // retrieve only layers related to the current dataset
  const currDatasetLayers = layers.filter(layer => layer.config.dataId === (dataset && dataset.id));

  return (
    <div className="delete-dataset-modal">
      <DatasetLabel dataset={dataset} />
      <StyledMsg className="delete-dataset-msg">
        <FormattedMessage
          id={'modal.deleteData.warning'}
          values={{ length: currDatasetLayers.length }}
        />
      </StyledMsg>
    </div>
  );
};

const DeleteDatasetModalFactory = () => DeleteDatasetModal;
export default DeleteDatasetModalFactory;
