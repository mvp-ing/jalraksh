// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import styled from 'styled-components';

export const FlexContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const FlexColContainer = styled(FlexContainer)`
  flex-direction: column;
`;

export const FlexContainerGrow = styled(FlexContainer)`
  flex-grow: 1;
`;
