export const getDayStartAndEndTimestamps = (date) => {
  const start = moment(date).startOf('day').valueOf();
  const end = moment(date).endOf('day').valueOf();
  return { start, end };
};

// const getPerformanceDensity = (period) => {
//   switch (period) {
//     case HALF_AN_HOUR:
//       return 30;
//     case WEEK:
//       return 84;
//     case MONTH:
//       return 90;
//     case DAY:
//       return 48;
//     default:
//       return 48;
//   }
// };

const DAY = 1000 * 60 * 60 * 24;
const WEEK = DAY * 8;

const startWithZero = num => (num < 10 ? `0${ num }` : `${ num }`);
const weekdays = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
// const months = [ "January", "February" ];
export const getTimeString = (ts, period) => {
  const date = new Date(ts);
  const diff = period.end - period.start;
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

export const getStartAndEndTimestampsByDensity = (current, start, end, density) => {
  const diff = end - start;
  const step = Math.floor(diff / density);
  const currentIndex = Math.floor((current - start) / step);
  const startTimestamp = parseInt(start + currentIndex * step);
  const endTimestamp = parseInt(startTimestamp + step);
  return { startTimestamp, endTimestamp };
};