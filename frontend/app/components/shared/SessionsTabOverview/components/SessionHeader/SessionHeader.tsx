import React from 'react';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import { Grid, Space } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import SessionSort from '../SessionSort';
import SessionTags from '../SessionTags';

const { useBreakpoint } = Grid;

function SessionHeader() {
  const { searchStore } = useStore();
  const screens = useBreakpoint();
  const { startDate, endDate, rangeValue } = searchStore.instance;

  const period = Period({
    start: startDate,
    end: endDate,
    rangeName: rangeValue,
  });

  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    searchStore.edit(dateValues);
    void searchStore.fetchSessions(true);
  };

  return (
    <div className="flex items-center px-4 py-3 justify-between w-full">
      <div
        className={`flex w-full flex-wrap gap-2 ${screens.md ? 'justify-between' : 'justify-start'}`}
      >
        <SessionTags />
        <div
          style={{ flexDirection: screens.md ? 'row' : 'column' }}
          className={'flex items-start'}
        >
          <SelectDateRange
            isAnt
            period={period}
            onChange={onDateChange}
            right
          />
          <SessionSort />
        </div>
      </div>
    </div>
  );
}

export default observer(SessionHeader);
