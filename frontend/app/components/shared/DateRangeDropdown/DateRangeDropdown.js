import { Dropdown } from 'semantic-ui-react';
import cn from 'classnames';
import {
  getDateRangeFromValue,
  getDateRangeLabel,
  dateRangeValues,
  getDateRangeFromTs,
  CUSTOM_RANGE,
  DATE_RANGE_VALUES,
} from 'App/dateRange';
import { Icon } from 'UI';
import DateRangePopup from './DateRangePopup';
import DateOptionLabel from './DateOptionLabel';
import styles from './dateRangeDropdown.css';

const getDateRangeOptions = (customRange = getDateRangeFromValue(CUSTOM_RANGE)) => dateRangeValues.map(value => ({
  value,
  text: <DateOptionLabel range={ value === CUSTOM_RANGE ? customRange : getDateRangeFromValue(value) } />,
  content: getDateRangeLabel(value),
}));

export default class DateRangeDropdown extends React.PureComponent {
  state = {
    showDateRangePopup: false,
    range: null,
    value: DATE_RANGE_VALUES.TODAY,
  };

  static getDerivedStateFromProps(props) {
    const { rangeValue, startDate, endDate } = props;
    if (rangeValue) {
      const range = rangeValue === CUSTOM_RANGE
        ? getDateRangeFromTs(startDate, endDate)
        : getDateRangeFromValue(rangeValue);
      return {
        value: rangeValue,
        range,
      };
    }
    return null;
  }

  onCancelDateRange = () => this.setState({ showDateRangePopup: false });

  onApplyDateRange = (range, value) => {
    this.setState({
      showDateRangePopup: false,
      range,
      value,
    });

    this.props.onChange({
      startDate: range.start.unix() * 1000,
      endDate: range.end.unix() * 1000,
      rangeValue: value,
    });
  }

  onItemClick = (event, { value }) => {
    if (value !== CUSTOM_RANGE) {
      const range = getDateRangeFromValue(value);
      this.onApplyDateRange(range, value);
    } else {
      this.setState({ showDateRangePopup: true });
    }
  }

  render() {
    const { customRangeRight, button = false, className, direction = 'right', customHidden=false, show30Minutes=false } = this.props;
    const { showDateRangePopup, value, range } = this.state;

    let options = getDateRangeOptions(range);
    
    if (customHidden) {
      options.pop();
    }

    if (!show30Minutes) {
      options.shift()
    }

    return (
      <div className={ cn(styles.dateRangeOptions, className) }>
        <Dropdown
          trigger={ button ?
            <div className={ cn(styles.dropdownTrigger, 'flex items-center')}>
              <span>{ value === CUSTOM_RANGE ? range.start.format('MMM Do YY, hh:mm A') + ' - ' + range.end.format('MMM Do YY, hh:mm A') :  getDateRangeLabel(value) }</span>
              <Icon name="chevron-down" color="gray-dark" size="14" className={styles.dropdownIcon} />
            </div> : null
          }
          // selection={!button}
          name="sessionDateRange"
          direction={ direction }
          className={ button ? "" : "customDropdown" }
          // pointing="top left"
          placeholder="Select..."
          icon={ null }
        >
          <Dropdown.Menu>
            { options.map((props, i) => 
              <Dropdown.Item 
                key={i}
                {...props}
                onClick={this.onItemClick}
                active={props.value === value }
              />
            ) }
          </Dropdown.Menu>
        </Dropdown>
        {
          showDateRangePopup &&
          <div className={ cn(styles.dateRangePopup, { [styles.customRangeRight] : customRangeRight}) }>
            <DateRangePopup
              onApply={ this.onApplyDateRange }
              onCancel={ this.onCancelDateRange }
              selectedDateRange={ range }
            />
          </div>
        }
      </div>
    );
  }
}
