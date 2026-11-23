/**
 * Player time 1ms before the session's click on the page: the page as the visitor
 * saw it, before the click changed it. The player timeline is zeroed on the
 * session's real start, not on the second-truncated startTs of the heatmap query.
 */
export function heatmapJumpTime(data: {
  eventTimestamp?: number;
  startTs?: number;
  startedAt?: number;
}): number {
  const sessionStart = data.startedAt ?? data.startTs ?? 0;
  const eventTs = data.eventTimestamp || sessionStart;
  return Math.max(0, eventTs - sessionStart - 1);
}
