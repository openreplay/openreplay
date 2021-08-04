import { connect } from 'react-redux';
import DateRangeDropdown from 'Shared/DateRangeDropdown';

function DateRange (props) {
  const { startDate, endDate, rangeValue, className, onDateChange, customRangeRight=false, customHidden = false } = props;
  
  return (
    <DateRangeDropdown
      button
      onChange={ onDateChange }
      rangeValue={ rangeValue }
      startDate={ startDate }
      endDate={ endDate }
      className={ className }
      customRangeRight={customRangeRight}
      customHidden={customHidden}
    />
  );  
}

export default DateRange