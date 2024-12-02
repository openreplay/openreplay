import React, { useMemo } from 'react';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import SessionTags from '../SessionTags';
import SessionSort from '../SessionSort';
import { Space } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function SessionHeader() {
  const { searchStore, userStore } = useStore();
  const isEnterprise = userStore.isEnterprise;
  const activeTab = searchStore.activeTab;
  const { startDate, endDate, rangeValue } = searchStore.instance;

  const period = Period({ start: startDate, end: endDate, rangeName: rangeValue });

  const title = useMemo(() => {
    if (activeTab && activeTab.type === 'bookmarks') {
      return isEnterprise ? 'Vault' : 'Bookmarks';
    }
    return 'Sessions';
  }, [activeTab?.type, isEnterprise]);

  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    searchStore.edit(dateValues);
    void searchStore.fetchSessions(true);
  };

  return (
    <div className="flex items-center px-4 py-1 justify-between w-full">
      <h2 className="text-2xl capitalize mr-4">{title}</h2>
      <div className="flex items-center w-full justify-end">
        {activeTab.type !== 'bookmarks' && <SessionTags />}
        <div className="mr-auto" />
        <Space>
          {activeTab.type !== 'bookmarks' &&
            <SelectDateRange isAnt period={period} onChange={onDateChange} right={true} />}
          <SessionSort />
        </Space>
      </div>
    </div>
  );
}

export default observer(SessionHeader);
