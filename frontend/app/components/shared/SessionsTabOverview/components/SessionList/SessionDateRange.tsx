import React from 'react';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function SessionDateRange() {
  const { searchStore } = useStore();
  const { startDate, endDate, rangeValue } = searchStore.instance
  ;
  const period: any = Period({ start: startDate, end: endDate, rangeName: rangeValue });
  const isCustom = period.rangeName === 'CUSTOM_RANGE';
  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    searchStore.applyFilter(dateValues);
  };
  return (
    <div className="flex items-center">
      <span className="mr-1">No sessions {isCustom ? 'between' : 'in the'}</span>
      <SelectDateRange period={period} onChange={onDateChange} right={true} useButtonStyle={true} />
    </div>
  );
}

export default observer(SessionDateRange);
