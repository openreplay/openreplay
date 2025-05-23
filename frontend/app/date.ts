// @flow

import { DateTime, Duration } from 'luxon'; // TODO
import { Timezone } from 'App/mstore/types/sessionSettings';
import { LAST_24_HOURS, LAST_30_DAYS, LAST_7_DAYS } from 'Types/app/period';
import { CUSTOM_RANGE } from '@/dateRange';

export function getDateFromString(
  date: string,
  format = 'yyyy-MM-dd HH:mm:ss:SSS',
): string {
  return DateTime.fromISO(date).toFormat(format);
}

/**
 * Formats a given duration.
 *
 * @param {Duration | number} inputDuration - The duration to format. Can be a Duration object or a number representing
 *   milliseconds.
 * @returns {string} - Formatted duration string.
 *
 * @example
 *
 * // Format a duration from a Duration object
 * const duration1 = Duration.fromObject({ hours: 2, minutes: 30 });
 * console.log(durationFormatted(duration1)); // Outputs: "2h30m"
 *
 * // Format a duration from milliseconds
 * console.log(durationFormatted(55000)); // Outputs: "55s"
 */
export const durationFormatted = (inputDuration: Duration | number): string => {
  let duration: Duration;

  if (inputDuration instanceof Duration) {
    duration = inputDuration;
  } else {
    duration = Duration.fromMillis(inputDuration);
  }

  if (duration.as('minutes') < 1) {
    // show in seconds
    return duration.toFormat("s's'");
  }
  if (duration.as('hours') < 1) {
    // show in minutes
    return duration.toFormat("m'm's's'");
  }
  if (duration.as('days') < 1) {
    // show in hours and minutes
    return duration.toFormat("h'h'm'm'");
  }
  if (duration.as('months') < 1) {
    // show in days and hours
    return duration.toFormat("d'd'h'h'");
  }
  return duration.toFormat("m'm's's'");
};

export function durationFromMsFormatted(ms: number): string {
  return durationFormatted(Duration.fromMillis(ms || 0));
}

export function shortDurationFromMs(ms: number): string {
  const dur = Duration.fromMillis(ms);

  return dur.toFormat('mm:ss');
}

export function durationFromMs(ms: number, isFull?: boolean): string {
  const dur = Duration.fromMillis(ms);

  return dur.toFormat(`hh:mm:ss${isFull ? '.SSS' : ''}`);
}

export const durationFormattedFull = (duration: Duration): string => {
  if (duration.as('minutes') < 1) {
    // show in seconds
    const d = duration.toFormat('s');
    duration = d + (d > 1 ? ' seconds' : ' second');
  } else if (duration.as('hours') < 1) {
    // show in minutes
    const d = duration.toFormat('m');
    duration = d + (d > 1 ? ' minutes' : ' minute');
  } else if (duration.as('days') < 1) {
    // show in hours and minutes
    const d = duration.toFormat('h');
    duration = d + (d > 1 ? ' hours' : ' hour');
  } else if (duration.as('months') < 1) {
    // show in days and hours
    const d = duration.toFormat('d');
    duration = d + (d > 1 ? ' days' : ' day');
  } else {
    const d = Math.trunc(duration.as('months'));
    duration = d + (d > 1 ? ' months' : ' month');
  }

  return duration;
};

export const msToMin = (ms: number): number => Math.round(ms / 60000);
export const msToSec = (ms: number): number => Math.round(ms / 1000);

export const diffFromNowString = (ts: number): string =>
  durationFormattedFull(
    DateTime.fromMillis(Date.now()).diff(DateTime.fromMillis(ts)),
  );

export const diffFromNowShortString = (ts: number): string =>
  durationFormatted(
    DateTime.fromMillis(Date.now()).diff(DateTime.fromMillis(ts)),
  );

export const getDateFromMill = (date) =>
  typeof date === 'number' ? DateTime.fromMillis(date) : undefined;

export const getTimeFromMill = (dateTime: number, tz: string) => {
  const date = DateTime.fromMillis(dateTime);
  return date.setZone(tz).toFormat('HH:mm:ss ZZZZ');
};

/**
 * Check if the given date is today.
 * @param {Date} Date to be checked.
 * @return {Boolean}
 */
export const isToday = (date: DateTime): boolean =>
  date.hasSame(new Date(), 'day');
export const isSameYear = (date: DateTime): boolean =>
  date.hasSame(new Date(), 'year');

export function formatDateTimeDefault(timestamp: number): string {
  const date = DateTime.fromMillis(timestamp);
  return isToday(date)
    ? 'Today'
    : `${date.toFormat('LLL dd, yyyy')}, ${date.toFormat('hh:mm a')}`;
}

/**
 * Formats timestamps into readable date
 * @param {Number} timestamp
 * @param {Object} timezone fixed offset like UTC+6
 * @returns {String} formatted date (or time if its today)
 */
export function formatTimeOrDate(
  timestamp: number,
  timezone?: Timezone,
  isFull = false,
): string {
  let date = DateTime.fromMillis(timestamp);
  if (timezone) {
    if (timezone.value === 'UTC') date = date.toUTC();
    date = date.setZone(timezone.value);
  }

  if (isFull) {
    const strHead = date.toFormat('LLL dd, yyyy, ');
    const strTail = date.toFormat('hh:mma').toLowerCase();
    return strHead + strTail;
  }

  if (isToday(date)) {
    return date.toFormat('hh:mma').toLowerCase();
  }
  if (isSameYear(date)) {
    const strHead = date.toFormat('LLL dd, ');
    const strTail = date.toFormat('hh:mma').toLowerCase();
    return strHead + strTail;
  }
  const strHead = date.toFormat('LLL dd, yyyy, ');
  const strTail = date.toFormat('hh:mma').toLowerCase();
  return strHead + strTail;
}

/**
 * Check if the given date is today/yesterday else return in specified format.
 * @param {Date} date Date to be cheked.
 * @param {String} format Returning date format.
 * @return {String} Formated date string.
 */
export const checkForRecent = (date: DateTime, format: string): string => {
  const d = new Date();
  // Today
  if (date.hasSame(d, 'day')) return 'Today';

  // Yesterday
  if (date.hasSame(d.setDate(d.getDate() - 1), 'day')) return 'Yesterday';

  // Formatted
  return date.toFormat(format);
};
export const resentOrDate = (ts, short?: boolean) => {
  const date = DateTime.fromMillis(ts);
  const d = new Date();
  // Today
  if (date.hasSame(d, 'day')) return `Today at ${date.toFormat('hh:mm a')}`;

  // Yesterday
  if (date.hasSame(d.setDate(d.getDate() - 1), 'day'))
    return `Yesterday at ${date.toFormat('hh:mm a')}`;
  return date.toFormat(`LLL dd, yyyy${short ? '' : ', hh:mm a'}`);
};

export const checkRecentTime = (date, format) => date.toRelative();

export const formatMs = (ms: number): string =>
  ms < 1000 ? `${Math.trunc(ms)}ms` : `${Math.trunc(ms / 100) / 10}s`;

export const convertTimestampToUtcTimestamp = (timestamp: number): number =>
  DateTime.fromMillis(timestamp).toUTC().toMillis();

export const nowFormatted = (format?: string): string =>
  DateTime.local().toFormat(format || 'LLL dd, yyyy, hh:mm a');

export const countDaysFrom = (timestamp: number): number => {
  const date = DateTime.fromMillis(timestamp);
  const d = new Date();
  return Math.round(
    Math.abs(d.getTime() - date.toJSDate().getTime()) / (1000 * 3600 * 24),
  );
};

export const getDateRangeUTC = (
  rangeName: string,
  customStartDate?: number,
  customEndDate?: number,
): {
  startDate: number;
  endDate: number;
} => {
  let endDate = new Date().getTime();
  let startDate: number;

  switch (rangeName) {
    case LAST_7_DAYS:
      startDate = endDate - 7 * 24 * 60 * 60 * 1000;
      break;
    case LAST_30_DAYS:
      startDate = endDate - 30 * 24 * 60 * 60 * 1000;
      break;
    case CUSTOM_RANGE:
      if (!customStartDate || !customEndDate) {
        throw new Error(
          'Start date and end date must be provided for CUSTOM_RANGE.',
        );
      }
      startDate = customStartDate;
      endDate = customEndDate;
      break;
    case LAST_24_HOURS:
    default:
      startDate = endDate - 24 * 60 * 60 * 1000;
  }

  return {
    startDate,
    endDate,
  };
};
