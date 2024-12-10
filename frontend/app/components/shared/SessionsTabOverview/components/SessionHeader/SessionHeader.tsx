import React, { useMemo } from 'react';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import SessionTags from '../SessionTags';
import SessionSort from '../SessionSort';
import { Space } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import cn from 'classnames'

function SessionHeader() {
  const { searchStore, userStore } = useStore();
  const isEnterprise = userStore.isEnterprise;
  const activeTab = searchStore.activeTab;
  const { startDate, endDate, rangeValue } = searchStore.instance;

  const period = Period({
    start: startDate,
    end: endDate,
    rangeName: rangeValue,
  });

  const title = useMemo(() => {
    if (activeTab.type === 'bookmarks') {
      return isEnterprise ? 'Vault' : 'Bookmarks';
    }
    return 'Sessions';
  }, [activeTab.type, isEnterprise]);

  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    searchStore.edit(dateValues);
    void searchStore.fetchSessions(true);
  };

  const hasTabs = title === 'Sessions';
  return (
    <div className="flex w-full flex-col">
      <div className="px-4 py-2">
        <div className={cn('text-2xl font-semibold capitalize')}>{title}</div>
        {hasTabs ? <div className={cn()}>
          Clips
        </div> : null}
      </div>
      <div className="py-2 px-4 flex items-center w-full justify-end">
        {activeTab.type !== 'bookmarks' && <SessionTags />}
        <div className="mr-auto" />
        <Space>
          {activeTab.type !== 'bookmarks' && (
            <SelectDateRange
              isAnt
              period={period}
              onChange={onDateChange}
              right={true}
            />
          )}
          <SessionSort />
        </Space>
      </div>
    </div>
  );
}

export default observer(SessionHeader);
