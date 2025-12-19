// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React from 'react';

import IconButton from '../icon-button';
import TippyTooltip from '../tippy-tooltip';
import {FormattedMessage} from 'react-intl';


function ResetControlFactory() {
  const ResetControl = ({
    showAnimationWindowControl,
    resetAnimation,
    btnStyle,
    playbackIcons,
    buttonHeight
  }) => {
    return showAnimationWindowControl ? null : (
      <TippyTooltip
        placement="top"
        delay={[500, 0]}
        render={() => <FormattedMessage id="tooltip.reset" />}
      >
        <IconButton className="playback-control-button" onClick={resetAnimation} {...btnStyle}>
          <playbackIcons.reset height={buttonHeight} />
        </IconButton>
      </TippyTooltip>
    );
  };

  return ResetControl;
}

export default ResetControlFactory;
