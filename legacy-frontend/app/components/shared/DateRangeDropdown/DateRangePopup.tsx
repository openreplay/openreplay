import { Button } from 'antd';
import React from 'react';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import 'react-calendar/dist/Calendar.css';

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
  const [range, setRange] = React.useState(props.selectedDateRange || Interval.fromDateTimes(DateTime.now(), DateTime.now()));
  const [value, setValue] = React.useState<string | null>(null);

  const selectCustomRange = (range) => {
    const updatedRange = Interval.fromDateTimes(DateTime.fromJSDate(range[0]), DateTime.fromJSDate(range[1]));
    setRange(updatedRange);
    setValue(CUSTOM_RANGE);
  };

  const setRangeTimeStart = (value: DateTime) => {
    if (!range.end || value > range.end) {
      return;
    }
    setRange(Interval.fromDateTimes(value, range.end));
    setValue(CUSTOM_RANGE);
  };

  const setRangeTimeEnd = (value: DateTime) => {
    if (!range.start || (value && value < range.start)) {
      return;
    }
    setRange(Interval.fromDateTimes(range.start, value));
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
  const rangeForDisplay = [range.start!.startOf('day').ts, range.end!.startOf('day').ts]
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
        <div className="flex justify-center h-fit dateRangeContainer">
          <DateRangePicker
            name="dateRangePicker"
            // onSelect={this.selectCustomRange} -> onChange
            // numberOfCalendars={2}
            // selectionType="range"
            // maximumDate={new Date()}
            // singleDateRange={true}
            onChange={selectCustomRange}
            shouldCloseCalendar={() => false}
            isOpen
            maxDate={new Date()}
            value={rangeForDisplay}
          />
        </div>
      </div>
      <div className="flex items-center justify-between py-2 px-3">
        <div className="flex items-center gap-2">
          <label>From: </label>
          <span>{range.start.toFormat("dd/MM")} </span>
          <TimePicker
            format={"HH:mm"}
            value={range.start}
            className="w-24"
            onChange={setRangeTimeStart}
            needConfirm={false}
            showNow={false}
          />
          <label>To: </label>
          <span>{range.end.toFormat("dd/MM")} </span>
          <TimePicker
            format={"HH:mm"}
            value={range.end}
            onChange={setRangeTimeEnd}
            className="w-24"
            needConfirm={false}
            showNow={false}
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