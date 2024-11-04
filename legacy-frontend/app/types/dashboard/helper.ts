const DAY = 1000 * 60 * 60 * 24;
const WEEK = DAY * 8;

const startWithZero = (num: number) => (num < 10 ? `0${ num }` : `${ num }`);
const weekdays = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];

export const getTimeString = (ts, period) => {
  const date = new Date(ts);
  const diff = period.endTimestamp - period.startTimestamp;
  if (diff <= DAY) {
    var isPM = date.getHours() >= 12;
    return `${ isPM ? date.getHours() - 12 : date.getHours() }:${ startWithZero(date.getMinutes()) } ${isPM? 'pm' : 'am'}`;
  }
  if (diff <= WEEK) {
    return weekdays[ date.getDay() ];
  }
  return `${ date.getDate() }/${ startWithZero(date.getMonth() + 1) } `;
};

export const getChartFormatter = period => (data = []) =>
  data.map(({ timestamp, ...rest }) => ({ time: getTimeString(timestamp, period), ...rest, timestamp }));

export const getStartAndEndTimestampsByDensity = (current: number, start: number, end: number, density: number) => {
  const diff = end - start;
  const step = Math.floor(diff / density);
  const currentIndex = Math.floor((current - start) / step);
  const startTimestamp = start + currentIndex * step;
  const endTimestamp = startTimestamp + step;
  return { startTimestamp, endTimestamp };
};