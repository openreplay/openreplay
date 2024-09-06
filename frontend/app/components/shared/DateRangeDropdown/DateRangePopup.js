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

export default class DateRangePopup extends React.PureComponent {
  state = {
    range: this.props.selectedDateRange || Interval.fromDateTimes(DateTime.now(), DateTime.now()),
    value: null,
  };

  selectCustomRange = (range) => {
    console.log(range)
    const updatedRange = Interval.fromDateTimes(DateTime.fromJSDate(range[0]), DateTime.fromJSDate(range[1]));
    this.setState({
      range: updatedRange,
      value: CUSTOM_RANGE,
    });
  };

  setRangeTimeStart = (value) => {
    if (value > this.state.range.end) {
      return;
    }
    this.setState({
      range: Interval.fromDateTimes(value, this.state.range.end),
      value: CUSTOM_RANGE,
    });
  };

  setRangeTimeEnd = (value) => {
    if (value && value < this.state.range.start) {
      return;
    }
    this.setState({
      range: Interval.fromDateTimes(this.state.range.start, value),
      value: CUSTOM_RANGE,
    });
  };

  selectValue = (value) => {
    const range = getDateRangeFromValue(value);
    this.setState({ range, value });
  };

  onApply = () => this.props.onApply(this.state.range, this.state.value);

  render() {
    const { onCancel, onApply } = this.props;
    const { range } = this.state;
    const rangeForDisplay = [range.start.startOf('day').ts, range.end.startOf('day').ts]

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
                <div key={value} onClick={() => this.selectValue(value)}>
                  {getDateRangeLabel(value)}
                </div>
              ))}
          </div>
          <div className='flex justify-center h-[294px] dateRangeContainer'>
            <DateRangePicker
              name="dateRangePicker"
              // onSelect={this.selectCustomRange} -> onChange
              // numberOfCalendars={2}
              // selectionType="range"
              // maximumDate={new Date()}
              // singleDateRange={true}
              onChange={this.selectCustomRange}
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
            <span>{range.start.toFormat('dd/MM')} </span>
            <TimePicker
              format={'HH:mm'}
              defaultValue={range.start}
              className="w-24"
              onChange={this.setRangeTimeStart}
              needConfirm={false}
              showNow={false}
            />
            <label>To: </label>
            <span>{range.end.toFormat('dd/MM')} </span>
            <TimePicker
              format={'HH:mm'}
              defaultValue={range.end}
              onChange={this.setRangeTimeEnd}
              className="w-24"
              needConfirm={false}
              showNow={false}
            />
          </div>
          <div className="flex items-center">
            <Button onClick={onCancel}>{'Cancel'}</Button>
            <Button
              type="primary"
              className="ml-2"
              onClick={this.onApply}
              disabled={!range}
            >
              {'Apply'}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
