// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React from 'react';
import styled from 'styled-components';
import { JALRAKSHAK_NAME, JALRAKSHAK_VERSION, JALRAKSHAK_WEBSITE } from '@jalrakshak/constants';

const LogoTitle = styled.div`
  display: inline-block;
  margin-left: 6px;
`;

const LogoName = styled.div`
  .logo__link {
    color: ${props => props.theme.logoColor};
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 1.17px;
  }
`;
const LogoVersion = styled.div`
  font-size: 10px;
  color: ${props => props.theme.subtextColor};
  letter-spacing: 0.83px;
  line-height: 14px;
`;

const LogoWrapper = styled.div`
  display: flex;
  align-items: flex-start;
`;

const LogoSvgWrapper = styled.div`
  margin-top: 3px;
`;

const LogoSvg = () => (
  <svg className="side-panel-logo__logo" width="32px" height="32px" viewBox="0 0 24 24">
    <path fill="#1FBAD6" d="M12 2L6 11C4 14 4 18 6 20C8 22 11 23 12 23C13 23 16 22 18 20C20 18 20 14 18 11L12 2Z" />
  </svg>
);
interface JalrakshakLogoProps {
  appName?: string;
  version?: string | boolean;
  appWebsite?: string;
}

const JalrakshakLogo = ({
  appName = JALRAKSHAK_NAME,
  appWebsite = JALRAKSHAK_WEBSITE,
  version = JALRAKSHAK_VERSION
}: JalrakshakLogoProps) => (
  <LogoWrapper className="side-panel-logo">
    <LogoSvgWrapper>
      <LogoSvg />
    </LogoSvgWrapper>
    <LogoTitle className="logo__title">
      <LogoName className="logo__name">
        <span className="logo__link">
          {appName}
        </span>
      </LogoName>
      {version ? <LogoVersion className="logo__version">{version}</LogoVersion> : null}
    </LogoTitle>
  </LogoWrapper>
);

export default JalrakshakLogo;
