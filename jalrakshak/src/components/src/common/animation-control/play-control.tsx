// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React from 'react';
import classnames from 'classnames';

import IconButton from '../icon-button';
import TippyTooltip from '../tippy-tooltip';
import {FormattedMessage} from 'react-intl';


function PlayControlFactory() {
  const PlayControl = ({
    showAnimationWindowControl,
    isAnimating,
    pauseAnimation,
    startAnimation,
    isSpeedControlVisible,
    btnStyle,
    playbackIcons,
    buttonHeight
  }) => {
    return showAnimationWindowControl ? null : (
      <TippyTooltip
        placement="top"
        delay={[500, 0]}
        render={() => <FormattedMessage id={isAnimating ? 'tooltip.pause' : 'tooltip.play'} />}
      >
        <IconButton
          className={classnames('playback-control-button', { active: isAnimating })}
          onClick={isAnimating ? pauseAnimation : startAnimation}
          hide={isSpeedControlVisible}
          {...btnStyle}
        >
          {isAnimating ? (
            <playbackIcons.pause height={buttonHeight} />
          ) : (
            <playbackIcons.play height={buttonHeight} />
          )}
        </IconButton>
      </TippyTooltip>
    );
  };

  return PlayControl;
}

export default PlayControlFactory;
