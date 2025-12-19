// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import styled from 'styled-components';
import Toolbar, { ToolbarProps } from './toolbar';

const VerticalToolbar = styled(Toolbar) <ToolbarProps>`
  flex-direction: column;

  .toolbar-item {
    width: 78px;
    padding: 13px 16px;
  }
`;

VerticalToolbar.displayName = 'VerticalToolbar';

export default VerticalToolbar;
