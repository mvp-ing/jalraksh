// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import { VisState } from '@jalrakshak/schemas';
import { Dispatch } from 'redux';

import { AiAssistantState } from '../reducers';
import { getEchartsTools } from './echarts-tools';
import { getGeoTools } from './geo-tools';
import { getJalrakshakTools } from './jalrakshak-tools';
import { getQueryTool } from './query-tool';

export function setupLLMTools({
  visState,
  aiAssistant,
  dispatch
}: {
  visState: VisState;
  aiAssistant: AiAssistantState;
  dispatch: Dispatch;
}) {
  return {
    ...getJalrakshakTools(visState, aiAssistant),
    ...getEchartsTools(visState.datasets, visState.layers, dispatch),
    ...getGeoTools(aiAssistant, visState.datasets, visState.layers, visState.layerData),
    ...getQueryTool(visState.datasets, visState.layers)
  };
}
