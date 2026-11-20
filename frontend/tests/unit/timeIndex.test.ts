import { describe, expect, test } from '@jest/globals';

import { lastIndexAtOrBefore } from '../../app/utils/timeIndex';

const sortedTimes = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 50))
    .sort((a, b) => a - b)
    .map((time) => ({ time }));

describe('lastIndexAtOrBefore', () => {
  test('matches a linear scan, inclusive and strict', () => {
    for (let run = 0; run < 500; run++) {
      const list = sortedTimes(run % 12);
      const t = Math.floor(Math.random() * 60) - 5;
      let inclusive = -1;
      let strict = -1;
      list.forEach((it, i) => {
        if (it.time <= t) inclusive = i;
        if (it.time < t) strict = i;
      });
      expect(lastIndexAtOrBefore(list, t)).toBe(inclusive);
      expect(lastIndexAtOrBefore(list, t, true)).toBe(strict);
    }
  });

  test('strict + 1 is the first index at or after the threshold', () => {
    for (let run = 0; run < 200; run++) {
      const list = sortedTimes(run % 9);
      const t = Math.floor(Math.random() * 60) - 5;
      const first = list.findIndex((it) => it.time >= t);
      expect(lastIndexAtOrBefore(list, t, true) + 1).toBe(
        first === -1 ? list.length : first,
      );
    }
  });
});
