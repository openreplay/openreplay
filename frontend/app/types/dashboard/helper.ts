const DAY = 1000 * 60 * 60 * 24;
const WEEK = DAY * 8;

const startWithZero = (num: number) => (num < 10 ? `0${num}` : `${num}`);
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getTimeString = (ts, period, density) => {
  const date = new Date(ts);
  const diff = period.endTimestamp - period.startTimestamp;
  if (diff <= DAY) {
    const isPM = date.getHours() >= 12;
    return `${isPM ? date.getHours() - 12 : date.getHours()}:${startWithZero(date.getMinutes())} ${isPM ? 'pm' : 'am'}`;
  }
  if (diff <= WEEK) {
    if (density < 20) {
      return weekdays[date.getDay()];
    }
    const isPM = date.getHours() >= 12;
    return `${weekdays[date.getDay()]} ${isPM ? date.getHours() - 12 : date.getHours()}:${startWithZero(date.getMinutes())} ${isPM ? 'pm' : 'am'}`;
  }
  return `${date.getDate()}/${startWithZero(date.getMonth() + 1)} `;
};

export const getChartFormatter =
  (period, density) =>
  (data = []) =>
    data.map(({ timestamp, ...rest }) => ({
      time: getTimeString(timestamp, period, density),
      ...rest,
      timestamp,
    }));

/**
 * The backend drops empty buckets, so a quiet range comes back with fewer
 * points than were asked for and the x-axis stops being evenly spaced.
 * Rebuild the grid from the requested period/density and zero-fill the holes.
 */
export const fillTimeseriesGaps = (
  data: Record<string, any>[] = [],
  period: { startTimestamp?: number; endTimestamp?: number },
  density?: number,
) => {
  const start = period?.startTimestamp;
  const end = period?.endTimestamp;
  if (!density || density < 2 || !start || !end || end <= start) return data;
  if (data.length >= density) return data;

  const step = Math.floor((end - start) / density);
  if (step <= 0) return data;

  const seriesKeys = new Set<string>();
  data.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'timestamp') seriesKeys.add(key);
    });
  });

  const bySlot = new Map<number, Record<string, any>>();
  for (const point of data) {
    const raw = Math.round((point.timestamp - start) / step);
    const slot = Math.min(Math.max(raw, 0), density - 1);
    // two points in one slot means the response is not on this grid; leave it be
    if (bySlot.has(slot)) return data;
    bySlot.set(slot, point);
  }

  const filled: Record<string, any>[] = [];
  for (let i = 0; i < density; i++) {
    const point = bySlot.get(i);
    if (point) {
      filled.push(point);
      continue;
    }
    const empty: Record<string, any> = { timestamp: start + i * step };
    seriesKeys.forEach((key) => {
      empty[key] = 0;
    });
    filled.push(empty);
  }
  return filled;
};

export const getStartAndEndTimestampsByDensity = (
  current: number,
  start: number,
  end: number,
  density: number,
) => {
  const diff = end - start;
  const step = Math.floor(diff / density);
  const currentIndex = Math.floor((current - start) / step);
  const startTimestamp = start + currentIndex * step;
  const endTimestamp = startTimestamp + step;
  return { startTimestamp, endTimestamp };
};
