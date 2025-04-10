import { DateTime, Interval, Settings } from 'luxon';
import Record from 'Types/Record';

export const LAST_30_MINUTES = 'LAST_30_MINUTES';
export const TODAY = 'TODAY';
export const LAST_24_HOURS = 'LAST_24_HOURS';
export const YESTERDAY = 'YESTERDAY';
export const LAST_7_DAYS = 'LAST_7_DAYS';
export const LAST_30_DAYS = 'LAST_30_DAYS';
export const THIS_MONTH = 'THIS_MONTH';
export const LAST_MONTH = 'LAST_MONTH';
export const THIS_YEAR = 'THIS_YEAR';
export const CUSTOM_RANGE = 'CUSTOM_RANGE';

function roundToNext15Minutes(dateTime) {
  const minutes = dateTime.minute;
  const secondsAndMillis = dateTime.second + (dateTime.millisecond / 1000);

  // Calculate minutes to add to reach next 15-minute slot
  const minutesToAdd = (15 - (minutes % 15)) % 15;

  // If exactly at 15-minute mark but has seconds/milliseconds, round up to next slot
  const adjustedMinutesToAdd = (minutesToAdd === 0 && secondsAndMillis > 0) ? 15 : minutesToAdd;

  return dateTime
    .plus({ minutes: adjustedMinutesToAdd })
    .set({ second: 0, millisecond: 0 });
}

// Helper function to get rounded now
function getRoundedNow(offset) {
  const now = DateTime.now().setZone(offset);
  return roundToNext15Minutes(now);
}

function getRange(rangeName, offset) {
  const now = getRoundedNow(offset);

  switch (rangeName) {
    case TODAY:
      return Interval.fromDateTimes(now.startOf('day'), now.endOf('day'));
    case YESTERDAY:
      const yesterday = now.minus({ days: 1 });
      return Interval.fromDateTimes(
        yesterday.startOf('day'),
        yesterday.endOf('day')
      );
    case LAST_24_HOURS:
      return Interval.fromDateTimes(now.minus({ hours: 24 }), now);
    case LAST_30_MINUTES:
      return Interval.fromDateTimes(
        now.minus({ minutes: 30 }),
        now
      );
    case LAST_7_DAYS:
      return Interval.fromDateTimes(
        now.minus({ days: 7 }).startOf('day'),
        now.endOf('day')
      );
    case LAST_30_DAYS:
      return Interval.fromDateTimes(
        now.minus({ days: 30 }).startOf('day'),
        now.endOf('day')
      );
    case THIS_MONTH:
      return Interval.fromDateTimes(now.startOf('month'), now.endOf('month'));
    case LAST_MONTH:
      const lastMonth = now.minus({ months: 1 });
      return Interval.fromDateTimes(lastMonth.startOf('month'), lastMonth.endOf('month'));
    case THIS_YEAR:
      return Interval.fromDateTimes(now.startOf('year'), now.endOf('year'));
    default:
      return Interval.fromDateTimes(now, now);
  }
}

// Get the current rounded time for default Record value
const defaultNow = getRoundedNow();

export default Record(
  {
    start: 0,
    end: 0,
    rangeName: CUSTOM_RANGE,
    range: Interval.fromDateTimes(defaultNow, defaultNow)
  },
  {
    fromJS: (period) => {
      const offset = period.timezoneOffset || DateTime.now().offset;

      if (!period.rangeName || period.rangeName === CUSTOM_RANGE) {
        const isLuxon = DateTime.isDateTime(period.start);
        let start, end;

        if (isLuxon) {
          start = roundToNext15Minutes(period.start);
          end = roundToNext15Minutes(period.end);
        } else {
          start = roundToNext15Minutes(
            DateTime.fromMillis(period.start || 0, { zone: Settings.defaultZone })
          );
          end = roundToNext15Minutes(
            DateTime.fromMillis(period.end || 0, { zone: Settings.defaultZone })
          );
        }

        const range = Interval.fromDateTimes(start, end);
        return {
          ...period,
          range,
          start: range.start.toMillis(),
          end: range.end.toMillis()
        };
      }

      const range = getRange(period.rangeName, offset);
      return {
        ...period,
        range,
        start: range.start.toMillis(),
        end: range.end.toMillis()
      };
    },
    methods: {
      toJSON() {
        return {
          startDate: this.start,
          endDate: this.end,
          rangeName: this.rangeName,
          rangeValue: this.rangeName
        };
      },
      toTimestamps() {
        return {
          startTimestamp: this.start,
          endTimestamp: this.end
        };
      },
      rangeFormatted(format = 'MMM dd yyyy, HH:mm', tz) {
        const start = this.range.start.setZone(tz);
        const end = this.range.end.setZone(tz);
        return `${start.toFormat(format)} - ${end.toFormat(format)}`;
      }
    }
  }
);
