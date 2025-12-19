// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React, { MouseEventHandler } from 'react';
import styled from 'styled-components';


import { Button } from '../../common/styled-components';
import {FormattedMessage} from 'react-intl';


const StyledHowToButton = styled.div`
  position: absolute;
  right: 12px;
  top: -4px;
`;

export type HowToButtonProps = {
  onClick: MouseEventHandler;
};

export const HowToButton: React.FC<HowToButtonProps> = ({ onClick }: HowToButtonProps) => (
  <StyledHowToButton>
    <Button link small onClick={onClick}>
      <FormattedMessage id={'layerConfiguration.howTo'} />
    </Button>
  </StyledHowToButton>
);

export default HowToButton;
