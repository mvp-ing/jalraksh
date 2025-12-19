// SPDX-License-Identifier: MIT
// Copyright Jalraksh



export type FileCacheItem = {
  data: any;
  info: {
    id?: string;
    label: string;
    format: string;
  };
};

export type ValidJalrakshakMap = {
  datasets: unknown;
  config: unknown;
  info: Record<string, string>;
};
