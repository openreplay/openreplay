export function getTimelinePosition(value: number, scale: number) {
  const pos = value * scale;
  // an event stamped before the recording starts stays on the track
  if (pos < 0) return 0;
  return pos > 100 ? 99 : pos;
}
