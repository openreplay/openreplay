import React from 'react';
import DateRangeDropdown from 'Shared/DateRangeDropdown';

function DateRange (props) {
  const { direction = "left", startDate, endDate, rangeValue, className, onDateChange, customRangeRight=false, customHidden = false } = props;
  
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
      direction={direction}
    />
  );  
}

export default DateRange