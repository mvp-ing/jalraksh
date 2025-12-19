// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import {LoadDataModalFactory, withState} from '@jalrakshak/components';
import {LOADING_METHODS} from '../constants/default-settings';

import LoadRemoteMap from '../components/load-data-modal/load-remote-map';
import {loadRemoteMap} from '../actions';

const CustomLoadDataModalFactory = (...deps) => {
  const LoadDataModal = LoadDataModalFactory(...deps);
  const defaultLoadingMethods = LoadDataModal.defaultLoadingMethods;
  const additionalMethods = {
    remote: {
      id: LOADING_METHODS.remote,
      label: 'modal.loadData.remote',
      elementType: LoadRemoteMap
    }
  };

  // add more loading methods
  const loadingMethods = [
    defaultLoadingMethods.find(lm => lm.id === 'upload'),
    defaultLoadingMethods.find(lm => lm.id === 'tileset'),
    additionalMethods.remote,
    defaultLoadingMethods.find(lm => lm.id === 'storage')
  ];

  return withState(
    [],
    state => ({...state.demo.app, ...state.demo.jalrakshakGl.map.uiState, loadingMethods}),
    {
      onLoadRemoteMap: loadRemoteMap
    }
  )(LoadDataModal);
};

CustomLoadDataModalFactory.deps = LoadDataModalFactory.deps;

export function replaceLoadDataModal() {
  return [LoadDataModalFactory, CustomLoadDataModalFactory];
}
