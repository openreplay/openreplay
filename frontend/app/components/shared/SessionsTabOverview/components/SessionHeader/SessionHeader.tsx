import React from 'react';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import { Space } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import SessionSort from '../SessionSort';
import SessionTags from '../SessionTags';

function SessionHeader() {
  const { searchStore } = useStore();
  const { startDate, endDate, rangeValue } = searchStore.instance;

  const period = Period({ start: startDate, end: endDate, rangeName: rangeValue });

  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    searchStore.edit(dateValues);
    void searchStore.fetchSessions(true);
  };

  return (
    <div className="flex items-center px-4 py-1 justify-between w-full">
      <div className="flex items-center w-full justify-end">
        <SessionTags />
        <div className="mr-auto" />
        <Space>
          <SelectDateRange isAnt period={period} onChange={onDateChange} right />
          <SessionSort />
        </Space>
      </div>
    </div>
  );
}

export default observer(SessionHeader);
