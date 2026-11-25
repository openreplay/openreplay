/**
 * Index of the last item at or before `t` (strictly before when `strict`) in a
 * time-sorted list; -1 when there is none.
 */
export function lastIndexAtOrBefore(
  list: readonly { time: number }[],
  t: number,
  strict = false,
): number {
  let lo = 0;
  let hi = list.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const time = list[mid].time ?? 0;
    if (strict ? time < t : time <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}
