import React from 'react';
import DateRangePicker from 'react-daterange-picker'
import { getDateRangeFromValue, getDateRangeLabel, dateRangeValues, CUSTOM_RANGE, moment, DATE_RANGE_VALUES } from 'App/dateRange';
import { Button } from 'antd'
import { TimePicker } from 'App/components/shared/DatePicker'

import styles from './dateRangePopup.module.css';

export default class DateRangePopup extends React.PureComponent {
  state = {
    range: this.props.selectedDateRange || moment.range(),
    value: null,
  }

  selectCustomRange = (range) => {
    range.end.endOf('day');
    this.setState({
      range,
      value: CUSTOM_RANGE,
    });
  }

  setRangeTimeStart = value => {
    if (value.isAfter(this.state.range.end)) {
      return;
    }
    this.setState({
      range: moment.range(
          value,
          this.state.range.end,
        ),
      value: CUSTOM_RANGE,
    });
  }
  setRangeTimeEnd = value => {
    if (value && value.isBefore(this.state.range.start)) {
      return;
    }
    this.setState({
      range: moment.range(
          this.state.range.start,
          value,
        ),
      value: CUSTOM_RANGE,
    });
  }

  selectValue = (value) => {
    const range = getDateRangeFromValue(value);
    this.setState({ range, value });
  }

  onApply = () => this.props.onApply(this.state.range, this.state.value)

  render() {
    const { onCancel, onApply } = this.props;
    const { range } = this.state;

    const rangeForDisplay = range.clone();
    rangeForDisplay.start.startOf('day');
    rangeForDisplay.end.startOf('day');

    const selectionRange = {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection',
    }

    return (
      <div className={ styles.wrapper }>
        <div className={ styles.body }>
          <div className={ styles.preSelections }>
            { dateRangeValues.filter(value => value !== CUSTOM_RANGE && value !== DATE_RANGE_VALUES.LAST_30_MINUTES).map(value => (
              <div
                key={ value }
                onClick={ () => this.selectValue(value) }
              >
                { getDateRangeLabel(value) }
              </div>
              ))
            }
          </div>
          <DateRangePicker
            name="dateRangePicker"
            onSelect={ this.selectCustomRange }
            numberOfCalendars={ 2 }
            // singleDateRange
            selectionType="range"
            maximumDate={ new Date() }
            singleDateRange={true}
            value={ rangeForDisplay }
          />
        </div>
        <div className="flex items-center justify-between py-2 px-3">
          <div className="flex items-center gap-2">
            <label>From: </label>
            <span>{range.start.format("DD/MM")} </span>
            <TimePicker
              format={"HH:mm"}
              defaultValue={ range.start }
              className="w-24"
              onChange={this.setRangeTimeStart}
              needConfirm={false}
              showNow={false}
            />
            <label>To: </label>
            <span>{range.end.format("DD/MM")} </span>
            <TimePicker
              format={"HH:mm"}
              defaultValue={ range.end }
              onChange={this.setRangeTimeEnd}
              className="w-24"
              needConfirm={false}
              showNow={false}
            />
          </div>
          <div className="flex items-center">
            <Button onClick={ onCancel }>{ 'Cancel' }</Button>
            <Button type="primary" className="ml-2" onClick={ this.onApply } disabled={ !range }>{ 'Apply' }</Button>
          </div>
        </div>
      </div>
    );
  }
}
