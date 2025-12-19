// SPDX-License-Identifier: MIT
// Copyright contributors to the jalrakshak project

export const LOCALES = {
  en: 'English',
  // fi: 'Suomi',
  // pt: 'Português',
  // es: 'Español',
  // ca: 'Català',
  // ja: '日本語',
  // cn: '简体中文',
  // ru: 'Русский'
};

/**
 * Localization can be passed to `Jalrakshak` via uiState `locale`.
 * Available languages are `en` and `fi`. Default language is `en`
 * @constant
 * @public
 * @example
 * ```js
 * import {combineReducers} from 'redux';
 * import {LOCALE_CODES} from '@jalrakshak/localization';
 *
 * const customizedJalrakshakReducer = GlReducer
 *   .initialState({
 *     uiState: {
 *       // use Finnish locale
 *       locale: LOCALE_CODES.fi
 *     }
 *   });
 *
 * ```
 */

export type LocaleCodesType = {
  [key: string]: string;
};

export const LOCALE_CODES: LocaleCodesType = Object.keys(LOCALES).reduce(
  (acc, key) => ({...acc, [key]: key}),
  {}
);
