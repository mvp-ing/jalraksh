// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React, { useCallback, useState } from 'react';
import styled, { css } from 'styled-components';

import { rgbToHex } from '@jalrakshak/utils';

import { RGBColor } from '@jalrakshak/types';

import { Portaled } from '../..';
import { Tooltip } from '../../common/styled-components';
import CustomPicker from '../layer-panel/custom-picker';
import { ColorBlock } from '../layer-panel/color-selector';
import {FormattedMessage} from 'react-intl';


const LayerGroupColorPickerWrapper = styled.div<{ $extraMarginRight?: boolean; disabled?: boolean }>`
  margin-right: ${props => (props.$extraMarginRight ? 0 : 24)}px;
  cursor: pointer;
  ${props =>
    props.disabled &&
    css`
      cursor: none;
      pointer-events: none;
      opacity: 0.3;
    `}
`;

export type LayerGroupColorPickerProps = {
  slug: string;
  color: RGBColor;
  onColorChange: (pd: RGBColor) => void;
  extraMarginRight: boolean;
  disabled: boolean;
};

LayerGroupColorPickerFactory.deps = [];

function LayerGroupColorPickerFactory() {
  const LayerGroupColorPicker: React.FC<LayerGroupColorPickerProps> = ({
    slug,
    color,
    onColorChange,
    extraMarginRight,
    disabled
  }) => {
    const [displayColorPicker, setDisplayColorPicker] = useState(false);

    const onColorBlockClick = useCallback(() => {
      setDisplayColorPicker(!displayColorPicker);
    }, [setDisplayColorPicker, displayColorPicker]);

    const onClosePicker = useCallback(() => {
      setDisplayColorPicker(false);
    }, [setDisplayColorPicker]);

    const onCustomPickerChange = useCallback(
      newColor => {
        onColorChange([newColor.rgb.r, newColor.rgb.g, newColor.rgb.b]);
      },
      [onColorChange]
    );

    return (
      <LayerGroupColorPickerWrapper $extraMarginRight={extraMarginRight} disabled={disabled}>
        <ColorBlock
          backgroundcolor={color}
          onClick={onColorBlockClick}
          className="color-selector__selector__block"
          data-tip
          data-for={`update-color-${slug}`}
        />
        <Tooltip id={`update-color-${slug}`} effect="solid" delayShow={500}>
          <span>
            <FormattedMessage id={'Update color'} />
          </span>
        </Tooltip>
        <Portaled
          isOpened={displayColorPicker !== false}
          left={110}
          top={-50}
          onClose={onClosePicker}
        >
          <CustomPicker color={rgbToHex(color)} onChange={onCustomPickerChange} />
        </Portaled>
      </LayerGroupColorPickerWrapper>
    );
  };

  return LayerGroupColorPicker;
}

export default LayerGroupColorPickerFactory;
