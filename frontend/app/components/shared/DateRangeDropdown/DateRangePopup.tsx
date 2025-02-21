import { Button } from 'antd';
import React from 'react';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import './ReactCalendar.css';

import { TimePicker } from 'App/components/shared/DatePicker';
import {
  CUSTOM_RANGE,
  DATE_RANGE_VALUES,
  dateRangeValues,
  getDateRangeFromValue,
  getDateRangeLabel,
} from 'App/dateRange';
import { DateTime, Interval } from 'luxon';

import styles from './dateRangePopup.module.css';

function DateRangePopup(props: any) {
  const [range, setRange] = React.useState(
    props.selectedDateRange ||
      Interval.fromDateTimes(DateTime.now(), DateTime.now())
  );
  const [value, setValue] = React.useState<string | null>(null);

  const selectCustomRange = (range) => {
    let newRange;
    if (props.singleDay) {
      newRange = Interval.fromDateTimes(
        DateTime.fromJSDate(range),
        DateTime.fromJSDate(range)
      );
    } else {
      newRange = Interval.fromDateTimes(
        DateTime.fromJSDate(range[0]),
        DateTime.fromJSDate(range[1])
      );
    }
    setRange(newRange);
    setValue(CUSTOM_RANGE);
  };

  const setRangeTimeStart = (value: DateTime) => {
    if (!range.end || value > range.end) {
      return;
    }
    const newRange = range.start.set({ hour: value.hour, minute: value.minute });
    setRange(Interval.fromDateTimes(newRange, range.end));
    setValue(CUSTOM_RANGE);
  };

  const setRangeTimeEnd = (value: DateTime) => {
    if (!range.start || (value && value < range.start)) {
      return;
    }
    const newRange = range.end.set({ hour: value.hour, minute: value.minute });
    setRange(Interval.fromDateTimes(range.start, newRange));
    setValue(CUSTOM_RANGE);
  };

  const selectValue = (value: string) => {
    const range = getDateRangeFromValue(value);
    setRange(range);
    setValue(value);
  };

  const onApply = () => {
    props.onApply(range, value);
  };

  const { onCancel } = props;
  const isUSLocale =
    navigator.language === 'en-US' || navigator.language.startsWith('en-US');

  const rangeForDisplay = props.singleDay
    ? range.start.ts
    : [range.start!.startOf('day').ts, range.end!.startOf('day').ts];
  return (
    <div className={styles.wrapper}>
      <div className={`${styles.body} h-fit`}>
        <div className={styles.preSelections}>
          {dateRangeValues
            .filter(
              (value) =>
                value !== CUSTOM_RANGE &&
                value !== DATE_RANGE_VALUES.LAST_30_MINUTES
            )
            .map((value) => (
              <div key={value} onClick={() => selectValue(value)}>
                {getDateRangeLabel(value)}
              </div>
            ))}
        </div>
        <div className="flex justify-center h-fit w-full items-center dateRangeContainer">
          <DateRangePicker
            name="dateRangePicker"
            onChange={selectCustomRange}
            shouldCloseCalendar={() => false}
            isOpen
            maxDate={new Date()}
            value={rangeForDisplay}
            calendarProps={{
              tileDisabled: props.isTileDisabled,
              selectRange: props.singleDay ? false : true,
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between py-2 px-3">
        {props.singleDay ? (
          <div>
            Compare from {range.start.toFormat('MMM dd, yyyy')}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label>From: </label>
            <span>{range.start.toFormat(isUSLocale ? 'MM/dd' : 'dd/MM')} </span>
            <TimePicker
              format={isUSLocale ? 'hh:mm a' : 'HH:mm'}
              value={range.start}
              onChange={setRangeTimeStart}
              needConfirm={false}
              showNow={false}
              style={{ width: isUSLocale ? 102 : 76 }}
            />
            <label>To: </label>
            <span>{range.end.toFormat(isUSLocale ? 'MM/dd' : 'dd/MM')} </span>
            <TimePicker
              format={isUSLocale ? 'hh:mm a' : 'HH:mm'}
              value={range.end}
              onChange={setRangeTimeEnd}
              needConfirm={false}
              showNow={false}
              style={{ width: isUSLocale ? 102 : 76 }}
            />
          </div>
        )}
        <div className="flex items-center">
          <Button onClick={onCancel}>{'Cancel'}</Button>
          <Button
            type="primary"
            className="ml-2"
            onClick={onApply}
            disabled={!range}
          >
            {'Apply'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DateRangePopup;
