import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

const sortOptionsMap = {
  'startTs-desc': 'Newest',
  'startTs-asc': 'Oldest',
  'eventsCount-asc': 'Events Ascending',
  'eventsCount-desc': 'Events Descending'
};

const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({
  // value,
  label,
  key: value
}));

export function SortDropdown<T>({ defaultOption, onSort, sortOptions, current }: {
  defaultOption?: string,
  onSort: ({ key, item }: { key: string, item: T }) => void,
  sortOptions: any,
  current: string
}) {
  return (
    <Dropdown
      menu={{
        items: sortOptions,
        defaultSelectedKeys: defaultOption ? [defaultOption] : undefined,
        // @ts-ignore
        onClick: onSort
      }}
    >
      <div
        className={
          'cursor-pointer flex items-center justify-end gap-2'
        }
      >
        <div>{current}</div>
        <DownOutlined />
      </div>
    </Dropdown>
  );
}

function SessionSort() {
  const { searchStore, sessionStore } = useStore();
  const onSessionSort = sessionStore.sortSessions;
  const { sort, order } = searchStore.instance;
  const onSort = ({ key }: { key: string }) => {
    const [sort, order] = key.split('-');
    const sign = order === 'desc' ? -1 : 1;
    console.log('sort', sort, 'order', order);
    searchStore.applyFilter({ order, sort });
    onSessionSort(sort, sign);
  };

  const defaultOption = `${sort}-${order}`;

  return (
    <SortDropdown
      defaultOption={defaultOption}
      onSort={onSort}
      sortOptions={sortOptions}
      current={sortOptionsMap[defaultOption]}
    />
  );
}

export default observer(SessionSort);
