import origMoment from "moment";
import { extendMoment } from "moment-range";
export const moment = extendMoment(origMoment);
import { DateTime } from "luxon";
import { TIMEZONE } from 'App/constants/storageKeys';

export const CUSTOM_RANGE = "CUSTOM_RANGE";

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

export function getDateRangeFromTs(start, end) {
    return moment.range(moment(start), moment(end));
}

export function getDateRangeLabel(value) {
    return DATE_RANGE_LABELS[value];
}

export function getDateRangeFromValue(value) {
    const tz = JSON.parse(localStorage.getItem(TIMEZONE));
    const offset = tz ? tz.label.slice(-6) : 0;

    switch (value) {
        case DATE_RANGE_VALUES.LAST_30_MINUTES:
            return moment.range(
                moment().utcOffset(offset).startOf("hour").subtract(30, "minutes"),
                moment().utcOffset(offset).startOf("hour")
            );
            case DATE_RANGE_VALUES.YESTERDAY:
                return moment.range(
                    moment().utcOffset(offset).subtract(1, "days").startOf("day"),
                    moment().utcOffset(offset).subtract(1, "days").endOf("day")
                    );
        case DATE_RANGE_VALUES.TODAY:
            return moment.range(moment().utcOffset(offset).startOf("day"), moment().utcOffset(offset).endOf("day"));
        case DATE_RANGE_VALUES.LAST_24_HOURS:
            return moment.range(moment().utcOffset(offset).subtract(24, "hours"), moment().utcOffset(offset));
        case DATE_RANGE_VALUES.LAST_7_DAYS:
            return moment.range(
                moment().utcOffset(offset).subtract(7, "days").startOf("day"),
                moment().utcOffset(offset).endOf("day")
            );
        case DATE_RANGE_VALUES.LAST_30_DAYS:
            return moment.range(
                moment().utcOffset(offset).subtract(30, "days").startOf("day"),
                moment().utcOffset(offset).endOf("day")
            );
        case DATE_RANGE_VALUES.THIS_MONTH:
            return moment().utcOffset(offset).range("month");
        case DATE_RANGE_VALUES.LAST_MONTH:
            return moment().utcOffset(offset).subtract(1, "months").range("month");
        case DATE_RANGE_VALUES.THIS_YEAR:
            return moment().utcOffset(offset).range("year");
        case DATE_RANGE_VALUES.CUSTOM_RANGE:
            return moment.range(moment().utcOffset(offset), moment().utcOffset(offset));
    }
    return null;
}

/**
 * Check if the given date is today/yesterday else return in specified format.
 * @param {Date} date Date to be cheked.
 * @param {String} format Returning date format.
 * @return {String} Formated date string.
 */
export const checkForRecent = (date, format) => {
    const d = new Date();
    // Today
    if (date.hasSame(d, "day")) return "Today";

    // Yesterday
    if (date.hasSame(d.setDate(d.getDate() - 1), "day")) return "Yesterday";

    // Formatted
    return date.toFormat(format);
};

export const overPastString = (period) => {
    if (period.rangeName === DATE_RANGE_VALUES.CUSTOM_RANGE) {
        const format = "LLL dd, yyyy HH:mm";
        const { startTimestamp, endTimestamp } = period.toTimestamps();
        const start = DateTime.fromMillis(startTimestamp).toFormat(format);
        const end = DateTime.fromMillis(endTimestamp).toFormat(format);
        return ` between ${start} - ${end}`;
    }

    return ' over the ' + DATE_RANGE_LABELS[period.rangeName];
};
