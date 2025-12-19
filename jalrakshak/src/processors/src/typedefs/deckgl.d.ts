// SPDX-License-Identifier: MIT
// Copyright Jalraksh



// Eslint does not seem to be able to understand the namespace re-export here
/* eslint-disable */

import * as DeckTypings from '@danmarshall/deckgl-typings';

declare module 'deck.gl' {
  export namespace DeckTypings {}
}
