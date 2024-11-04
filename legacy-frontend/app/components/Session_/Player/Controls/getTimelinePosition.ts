
export function getTimelinePosition(value: number, scale: number) {
  const pos = value * scale;

  return pos > 100 ? 99 : pos;
}
