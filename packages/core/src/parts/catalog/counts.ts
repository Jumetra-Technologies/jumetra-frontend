/**
 * How many parts the library has, in all and by group (a part's folder is its group).
 *
 * Written by `npm run parts:index`: do not edit it by hand. Pages that only
 * state the numbers import this, so they don't load every part to count them.
 */
export const PART_COUNTS = {
  total: 88,
  boards: 10,
  controls: 8,
  displays: 5,
  drivers: 8,
  motors: 7,
  outputs: 5,
  power: 10,
  prototyping: 8,
  radios: 5,
  sensors: 22,
} as const;
