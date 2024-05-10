// @ts-nocheck
import { DatePicker } from 'antd';
import { PickerTimeProps } from 'antd/es/time-picker';
import moment from 'moment';
import type { Moment } from 'moment';
import React from 'react';

const generateConfig = {
  // get
  getNow: () => moment(),
  getFixedDate: (string: string) => moment(string, 'YYYY-MM-DD'),
  getEndDate: (date) => {
    const clone = date.clone();
    return clone.endOf('month');
  },
  getWeekDay: (date) => {
    const clone = date.clone().locale('en_US');
    return clone.weekday() + clone.localeData().firstDayOfWeek();
  },
  getYear: (date) => date.year(),
  getMonth: (date) => date.month(),
  getDate: (date) => date.date(),
  getHour: (date) => date.hour(),
  getMinute: (date) => date.minute(),
  getSecond: (date) => date.second(),
  getMillisecond: (date) => date.millisecond(),

  // set
  addYear: (date, diff) => {
    const clone = date.clone();
    return clone.add(diff, 'year');
  },
  addMonth: (date, diff) => {
    const clone = date.clone();
    return clone.add(diff, 'month');
  },
  addDate: (date, diff) => {
    const clone = date.clone();
    return clone.add(diff, 'day');
  },
  setYear: (date, year) => {
    const clone = date.clone();
    return clone.year(year);
  },
  setMonth: (date, month) => {
    const clone = date.clone();
    return clone.month(month);
  },
  setDate: (date, num) => {
    const clone = date.clone();
    return clone.date(num);
  },
  setHour: (date, hour) => {
    const clone = date.clone();
    return clone.hour(hour);
  },
  setMinute: (date, minute) => {
    const clone = date.clone();
    return clone.minute(minute);
  },
  setSecond: (date, second) => {
    const clone = date.clone();
    return clone.second(second);
  },
  setMillisecond: (date, millisecond) => {
    const clone = date.clone();
    return clone.millisecond(millisecond);
  },

  // Compare
  isAfter: (date1, date2) => date1.isAfter(date2),
  isValidate: (date) => date.isValid(),

  locale: {
    getWeekFirstDay: (locale) => {
      const date = moment().locale(locale);
      return date.localeData().firstDayOfWeek();
    },
    getWeekFirstDate: (locale, date) => {
      const clone = date.clone();
      const result = clone.locale(locale);
      return result.weekday(0);
    },
    getWeek: (locale, date) => {
      const clone = date.clone();
      const result = clone.locale(locale);
      return result.week();
    },
    getShortWeekDays: (locale) => {
      const date = moment().locale(locale);
      return date.localeData().weekdaysMin();
    },
    getShortMonths: (locale) => {
      const date = moment().locale(locale);
      return date.localeData().monthsShort();
    },
    format: (locale, date, format) => {
      const clone = date.clone();
      const result = clone.locale(locale);
      return result.format(format);
    },
    parse: (locale, text, formats) => {
      const fallbackFormatList: string[] = [];

      for (let i = 0; i < formats.length; i += 1) {
        let format = formats[i];
        let formatText = text;

        if (format.includes('wo') || format.includes('Wo')) {
          format = format.replace(/wo/g, 'w').replace(/Wo/g, 'W');
          const matchFormat = format.match(/[-YyMmDdHhSsWwGg]+/g);
          const matchText = formatText.match(/[-\d]+/g);

          if (matchFormat && matchText) {
            format = matchFormat.join('');
            formatText = matchText.join('');
          } else {
            fallbackFormatList.push(format.replace(/o/g, ''));
          }
        }

        const date = moment(formatText, format, locale, true);
        if (date.isValid()) {
          return date;
        }
      }

      // Fallback to fuzzy matching, this should always not reach match or need fire a issue
      for (let i = 0; i < fallbackFormatList.length; i += 1) {
        const date = moment(text, fallbackFormatList[i], locale, false);

        /* istanbul ignore next */
        if (date.isValid()) {
          console.error(
            'Not match any format strictly and fallback to fuzzy match. Please help to fire a issue about this.'
          );
          return date;
        }
      }

      return null;
    },
  },
};

const CustomPicker = DatePicker.generatePicker<Moment>(generateConfig);

export interface TimePickerProps
  extends Omit<PickerTimeProps<Moment>, 'picker'> {}

const TimePicker = React.forwardRef<any, TimePickerProps>((props, ref) => (
  <CustomPicker {...props} picker="time" mode={undefined} ref={ref} />
));

TimePicker.displayName = 'TimePicker';

export { CustomPicker as DatePicker, TimePicker };
