import {cache} from 'react';

/** One pointer decision per server render, shared by manifest, browser and data
 * products. The process TTL may expire or be cleared while a render suspends;
 * that must affect only later renders, not the current response. */
export function requestGenerationSelection<T>(load:()=>Promise<T>):()=>Promise<T> {
  return cache(load);
}

/** Process memoization must be keyed by the selected immutable identity, not an
 * `active` slot whose TTL can overlap the independently refreshed pointer. */
export function generationSelectionKey(selection:{source:string;manifest:{version:string}}) {
  return `${selection.source}:${selection.manifest.version}`;
}
