// @flow

import { DateTime, Duration } from 'luxon'; // TODO
import { toJS } from 'mobx';
import { Timezone } from 'MOBX/types/sessionSettings';

export const durationFormatted = (duration: Duration):string => {
  if (duration.as('minutes') < 1) { // show in seconds
    duration = duration.toFormat('s\'s\'');
  } else if (duration.as('hours') < 1) { // show in minutes
    duration = duration.toFormat('m\'m\'s\'s');
  } else if (duration.as('days') < 1) { // show in hours and minutes
    duration = duration.toFormat('h\'h\'m\'m');
  } else if (duration.as('months') < 1) { // show in days and hours
    duration = duration.toFormat('d\'d\'h\'h');
  } else {
    duration = duration.toFormat('m\'m\'s\'s\'');
  }

  return duration;
};

export function durationFromMsFormatted(ms: number): string {
  return durationFormatted(Duration.fromMillis(ms || 0));
}

export const durationFormattedFull = (duration: Duration): string => {
  if (duration.as('minutes') < 1) { // show in seconds
    let d = duration.toFormat('s');
    duration = d + (d > 1 ? ' seconds' : ' second');
  } else if (duration.as('hours') < 1) { // show in minutes
    let d = duration.toFormat('m');
    duration = d + (d > 1 ? ' minutes' : ' minute');
  } else if (duration.as('days') < 1) { // show in hours and minutes
    let d = duration.toFormat('h');
    duration = d + (d > 1 ? ' hours' : ' hour');
  } else if (duration.as('months') < 1) { // show in days and hours
    let d = duration.toFormat('d');
    duration = d + (d > 1 ? ' days' : ' day');
  } else {
    let d = Math.trunc(duration.as('months'));
    duration = d + (d > 1 ? ' months' : ' month');;
  }

  return duration;
};

export const msToMin = (ms:number): number => Math.round(ms / 60000);
export const msToSec = (ms:number): number => Math.round(ms / 1000);

export const diffFromNowString = (ts:number): string =>
  durationFormattedFull(DateTime.fromMillis(Date.now()).diff(DateTime.fromMillis(ts)));

export const diffFromNowShortString = (ts: number): string =>
  durationFormatted(DateTime.fromMillis(Date.now()).diff(DateTime.fromMillis(ts)));

export const getDateFromMill = date =>
  (typeof date === "number" ? DateTime.fromMillis(date) : undefined);


/**
 * Check if the given date is today.
 * @param {Date} Date to be checked.
 * @return {Boolean}
 */
export const isToday = (date: DateTime):boolean => date.hasSame(new Date(), 'day');
export const isSameYear = (date: DateTime):boolean => date.hasSame(new Date(), 'year');

export function formatDateTimeDefault(timestamp: number): string {
  const date = DateTime.fromMillis(timestamp);
  return isToday(date) ? 'Today' : date.toFormat('LLL dd, yyyy') + ', ' + date.toFormat('hh:mm a')
}

/**
 * Formats timestamps into readable date
 * @param {Number} timestamp
 * @param {Object} timezone fixed offset like UTC+6
 * @returns {String} formatted date (or time if its today)
 */
export function formatTimeOrDate(timestamp: number, timezone: Timezone, isFull = false): string {
  var date = DateTime.fromMillis(timestamp)
  if (timezone) {
    if (timezone.value === 'UTC') date = date.toUTC();
    date = date.setZone(timezone.value)
  }

  if (isFull) {
    const strHead = date.toFormat('LLL dd, yyyy, ')
    const strTail = date.toFormat('hh:mma').toLowerCase()
    return strHead + strTail;
  }

  if (isToday(date)) {
    return date.toFormat('hh:mma').toLowerCase()
  }
  if (isSameYear(date)) {
    const strHead = date.toFormat('LLL dd, ')
    const strTail = date.toFormat('hh:mma').toLowerCase()
    return strHead + strTail;
  }
  const strHead = date.toFormat('LLL dd, yyyy, ')
  const strTail = date.toFormat('hh:mma').toLowerCase()
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
export const resentOrDate = (ts) => {
  const date = DateTime.fromMillis(ts);
  const d = new Date();
  // Today
  if (date.hasSame(d, 'day')) return 'Today at ' + date.toFormat('hh:mm a');

  // Yesterday
  if (date.hasSame(d.setDate(d.getDate() - 1), 'day')) return 'Yesterday at ' + date.toFormat('hh:mm a');
  return date.toFormat('LLL dd, yyyy, hh:mm a');
}

export const checkRecentTime = (date, format) => {
  return date.toRelative()
};

export const formatMs = (ms: number): string => ms < 1000 ? `${ Math.trunc(ms) }ms` : `${ Math.trunc(ms/100) / 10 }s`;

export const convertTimestampToUtcTimestamp = (timestamp: number): number => {
  return DateTime.fromMillis(timestamp).toUTC().toMillis();
}

export const nowFormatted = (format?: string): string => {
  return DateTime.local().toFormat(format || 'LLL dd, yyyy, hh:mm a');
}

export const countDaysFrom = (timestamp: number): number => {
  const date = DateTime.fromMillis(timestamp);
  const d = new Date();
  return Math.round(Math.abs(d.getTime() - date.toJSDate().getTime()) / (1000 * 3600 * 24));
}
