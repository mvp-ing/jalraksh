// SPDX-License-Identifier: MIT
// Copyright Jalraksh



/**
 * Capitalize first letter of a string
 */
export function capitalizeFirstLetter(str: string): string {
  return typeof str === 'string' ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}
