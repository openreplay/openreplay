import React, { useMemo } from 'react';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import SessionTags from '../SessionTags';
import NoteTags from '../Notes/NoteTags';
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
    if (activeTab.type === 'notes') {
      return 'Notes';
    }
    if (activeTab.type === 'bookmark') {
      return isEnterprise ? 'Vault' : 'Bookmarks';
    }
    return 'Sessions';
  }, [activeTab]);

  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    searchStore.edit(dateValues);
    searchStore.fetchSessions();
  };

  return (
    <div className="flex items-center px-4 py-1 justify-between w-full">
      <h2 className="text-2xl capitalize mr-4">{title}</h2>
      {activeTab.type !== 'notes' ? (
        <div className="flex items-center w-full justify-end">
          {activeTab.type !== 'bookmark' && (
            <>
              <SessionTags />
              <div className="mr-auto" />
              <Space>
                <SelectDateRange isAnt period={period} onChange={onDateChange} right={true} />
                <SessionSort />
              </Space>
            </>
          )}
        </div>
      ) : null}

      {activeTab.type === 'notes' && (
        <div className="flex items-center justify-end w-full">
          <NoteTags />
        </div>
      )}
    </div>
  );
}

export default observer(SessionHeader);
