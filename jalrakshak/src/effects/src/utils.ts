// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import {Effect as EffectInterface, EffectPropsPartial} from '@jalrakshak/types';
import {LIGHT_AND_SHADOW_EFFECT} from '@jalrakshak/constants';

import LightingEffect from './lighting-effect';
import PostProcessEffect from './post-processing-effect';

export function createEffect(params: EffectPropsPartial): EffectInterface {
  if (params?.type === LIGHT_AND_SHADOW_EFFECT.type) {
    return new LightingEffect(params);
  }
  return new PostProcessEffect(params);
}
