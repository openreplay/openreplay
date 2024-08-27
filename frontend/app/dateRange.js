import { DateTime, Interval } from 'luxon';

import { TIMEZONE } from 'App/constants/storageKeys';

export const CUSTOM_RANGE = 'CUSTOM_RANGE';

const DATE_RANGE_LABELS = {
    // LAST_30_MINUTES: '30 Minutes',
    // TODAY: 'Today',
    LAST_24_HOURS: "Past 24 Hours",
    // YESTERDAY: 'Yesterday',
    LAST_7_DAYS: "Past 7 Days",
    LAST_30_DAYS: "Past 30 Days",
    //THIS_MONTH: 'This Month',
    //LAST_MONTH: 'Previous Month',
    //THIS_YEAR: 'This Year',
    [CUSTOM_RANGE]: "Custom Range",
};

const DATE_RANGE_VALUES = {};
Object.keys(DATE_RANGE_LABELS).forEach((key) => {
  DATE_RANGE_VALUES[key] = key;
});

export { DATE_RANGE_VALUES };
export const dateRangeValues = Object.keys(DATE_RANGE_VALUES);

export const DATE_RANGE_OPTIONS = Object.keys(DATE_RANGE_LABELS).map((key) => {
  return {
    label: DATE_RANGE_LABELS[key],
    value: key,
  };
});

export function getDateRangeLabel(value) {
  return DATE_RANGE_LABELS[value];
}

export function getDateRangeFromValue(value) {
  const tz = JSON.parse(localStorage.getItem(TIMEZONE));
  const offset = tz.value

  const now = DateTime.now().setZone(offset);

  switch (value) {
    // case DATE_RANGE_VALUES.LAST_30_MINUTES:
    //   return Interval.fromDateTimes(
    //     now.minus({ minutes: 30 }).startOf('minute'),
    //     now.startOf('minute')
    //   );
    // case DATE_RANGE_VALUES.YESTERDAY:
    //   return Interval.fromDateTimes(
    //     now.minus({ days: 1 }).startOf('day'),
    //     now.minus({ days: 1 }).endOf('day')
    //   );
    // case DATE_RANGE_VALUES.TODAY:
    //   return Interval.fromDateTimes(now.startOf('day'), now.endOf('day'));
    case DATE_RANGE_VALUES.LAST_24_HOURS:
      return Interval.fromDateTimes(now.minus({ hours: 24 }), now);
    case DATE_RANGE_VALUES.LAST_7_DAYS:
      const range = Interval.fromDateTimes(
        now.minus({ days: 7 }).startOf('day'),
        now.endOf('day')
      );
        console.log(range, now.minus({ days: 7}))
      return Interval.fromDateTimes(
        now.minus({ days: 7 }).startOf('day'),
        now.endOf('day')
      );
    case DATE_RANGE_VALUES.LAST_30_DAYS:
      return Interval.fromDateTimes(
        now.minus({ days: 30 }).startOf('day'),
        now.endOf('day')
      );
    // case DATE_RANGE_VALUES.THIS_MONTH:
    //   return Interval.fromDateTimes(now.startOf('month'), now.endOf('month'));
    // case DATE_RANGE_VALUES.LAST_MONTH:
    //   const lastMonth = now.minus({ months: 1 });
    //   return Interval.fromDateTimes(
    //     lastMonth.startOf('month'),
    //     lastMonth.endOf('month')
    //   );
    // case DATE_RANGE_VALUES.THIS_YEAR:
    //   return Interval.fromDateTimes(now.startOf('year'), now.endOf('year'));
    // case DATE_RANGE_VALUES.CUSTOM_RANGE:
    //   return Interval.fromDateTimes(now, now);
    default:
      throw new Error('Invalid date range value');
  }
}

/**
 * Check if the given date is today/yesterday else return in specified format.
 * @param {DateTime} date Date to be checked.
 * @param {String} format Returning date format.
 * @return {String} Formatted date string.
 */
export const checkForRecent = (date, format) => {
  const now = DateTime.now();
  // Today
  if (date.hasSame(now, 'day')) return 'Today';

  // Yesterday
  if (date.hasSame(now.minus({ days: 1 }), 'day')) return 'Yesterday';

  // Formatted
  return date.toFormat(format);
};
