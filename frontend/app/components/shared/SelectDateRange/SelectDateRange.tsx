import { DateRange } from '@/ui/inputs/DateRange';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { DATE_RANGE_OPTIONS, LONG_DATE_RANGE_OPTIONS } from 'App/dateRange';

interface Props {
  period: any | null;
  onChange: (data: any) => void;
  disableCustom?: boolean;
  /** an outlined control (toolbars) rather than the inline text one */
  isAnt?: boolean;
  useButtonStyle?: boolean;
  longRange?: boolean;
  [x: string]: any;
}

/** Legacy entry point for the old period picker; it is the kit `DateRange` now. */
function SelectDateRange({
  period,
  onChange,
  disableCustom,
  isAnt,
  useButtonStyle,
  longRange,
}: Props) {
  return (
    <DateRange
      period={period}
      onChange={onChange}
      disableCustom={disableCustom}
      options={longRange ? LONG_DATE_RANGE_OPTIONS : DATE_RANGE_OPTIONS}
      variant={isAnt || useButtonStyle ? 'outline' : 'subtle'}
    />
  );
}

export default observer(SelectDateRange);
