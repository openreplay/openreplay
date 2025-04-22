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
import { DateTime, Interval, Settings } from 'luxon';

import styles from './dateRangePopup.module.css';

function DateRangePopup(props: any) {
  const [range, setRange] = React.useState(props.selectedDateRange || Interval.fromDateTimes(DateTime.now(), DateTime.now()));

  const [displayDates, setDisplayDates] = React.useState<Date[]>([new Date(), new Date()]);

  const [value, setValue] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (props.selectedDateRange) {
      const start = new Date(
        props.selectedDateRange.start.year,
        props.selectedDateRange.start.month - 1, // JS months are 0-based
        props.selectedDateRange.start.day
      );
      const end = new Date(
        props.selectedDateRange.end.year,
        props.selectedDateRange.end.month - 1,
        props.selectedDateRange.end.day
      );
      setDisplayDates([start, end]);
    }
  }, [props.selectedDateRange]);

  const createNaiveTime = (dateTime: DateTime) => {
    if (!dateTime) return null;
    return DateTime.fromObject({
      hour: dateTime.hour,
      minute: dateTime.minute
    });
  };

  const selectCustomRange = (newDates) => {
    if (!newDates || !newDates[0] || !newDates[1]) return;

    setDisplayDates(newDates);

    const selectedTzStart = DateTime.fromObject({
      year: newDates[0].getFullYear(),
      month: newDates[0].getMonth() + 1,
      day: newDates[0].getDate(),
      hour: 0,
      minute: 0
    }).setZone(Settings.defaultZone);

    const selectedTzEnd = DateTime.fromObject({
      year: newDates[1].getFullYear(),
      month: newDates[1].getMonth() + 1,
      day: newDates[1].getDate(),
      hour: 23,
      minute: 59
    }).setZone(Settings.defaultZone);

    const updatedRange = Interval.fromDateTimes(selectedTzStart, selectedTzEnd);
    setRange(updatedRange);
    setValue(CUSTOM_RANGE);
  };

  const setRangeTimeStart = (naiveTime: DateTime) => {
    if (!range.end || !naiveTime) return;

    const newStart = range.start.set({
      hour: naiveTime.hour,
      minute: naiveTime.minute
    });

    if (newStart > range.end) return;

    setRange(Interval.fromDateTimes(newStart, range.end));
    setValue(CUSTOM_RANGE);
  };

  const setRangeTimeEnd = (naiveTime: DateTime) => {
    if (!range.start || !naiveTime) return;

    const newEnd = range.end.set({
      hour: naiveTime.hour,
      minute: naiveTime.minute
    });

    if (newEnd < range.start) return;

    setRange(Interval.fromDateTimes(range.start, newEnd));
    setValue(CUSTOM_RANGE);
  };

  const selectValue = (value: string) => {
    const newRange = getDateRangeFromValue(value);

    const zonedStart = newRange.start.setZone(Settings.defaultZone);
    const zonedEnd = newRange.end.setZone(Settings.defaultZone);
    setRange(Interval.fromDateTimes(zonedStart, zonedEnd));

    const start = new Date(
      zonedStart.year,
      zonedStart.month - 1,
      zonedStart.day
    );
    const end = new Date(
      zonedEnd.year,
      zonedEnd.month - 1,
      zonedEnd.day
    );
    setDisplayDates([start, end]);

    setValue(value);
  };

  const onApply = () => {
    props.onApply(range, value);
  };

  const { onCancel } = props;
  const isUSLocale = navigator.language === 'en-US' || navigator.language.startsWith('en-US');

  // Create naive DateTime objects for TimePicker
  const naiveStartTime = createNaiveTime(range.start);
  const naiveEndTime = createNaiveTime(range.end);

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
            value={displayDates}
          />
        </div>
      </div>
      <div className="flex items-center justify-between py-2 px-3">
        <div className="flex items-center gap-2">
          <label>From: </label>
          <span>{range.start.toFormat(isUSLocale ? "MM/dd" : "dd/MM")} </span>
          <TimePicker
            format={isUSLocale ? 'hh:mm a' : "HH:mm"}
            value={naiveStartTime}
            onChange={setRangeTimeStart}
            needConfirm={false}
            showNow={false}
            style={{ width: isUSLocale ? 102 : 76 }}
          />
          <label>To: </label>
          <span>{range.end.toFormat(isUSLocale ? "MM/dd" : "dd/MM")} </span>
          <TimePicker
            format={isUSLocale ? 'hh:mm a' : "HH:mm"}
            value={naiveEndTime}
            onChange={setRangeTimeEnd}
            needConfirm={false}
            showNow={false}
            style={{ width: isUSLocale ? 102 : 76 }}
          />
        </div>
        <div className="flex items-center">
          <Button onClick={onCancel}>{"Cancel"}</Button>
          <Button
            type="primary"
            className="ml-2"
            onClick={onApply}
            disabled={!range}
          >
            {"Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DateRangePopup;
