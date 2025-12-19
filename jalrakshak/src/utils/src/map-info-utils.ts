// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import {MAP_INFO_CHARACTER} from '@jalrakshak/constants';

export function isValidMapInfo(mapInfo) {
  return (
    mapInfo.title.length &&
    mapInfo.title.length <= MAP_INFO_CHARACTER.title &&
    (!mapInfo.description.length || mapInfo.description.length <= MAP_INFO_CHARACTER.description)
  );
}
