import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const sortOptionsMap = (t: TFunction) => ({
  'startTs-desc': t('Newest'),
  'startTs-asc': t('Oldest'),
  'eventsCount-asc': t('Events Ascending'),
  'eventsCount-desc': t('Events Descending'),
});

const sortOptions = (t: TFunction) =>
  Object.entries(sortOptionsMap(t)).map(([value, label]) => ({
    label,
    key: value,
  }));

export function SortDropdown<T>({
  defaultOption,
  onSort,
  sortOptions,
  current,
}: {
  defaultOption?: string;
  onSort: ({ key, item }: { key: string; item: T }) => void;
  sortOptions: any;
  current: string;
}) {
  const { t } = useTranslation();
  return (
    <Dropdown
      menu={{
        items: sortOptions,
        selectedKeys: [defaultOption],
        onClick: onSort,
      }}
    >
      <div className="cursor-pointer flex items-center justify-end gap-2">
        <div>{current}</div>
        <DownOutlined />
      </div>
    </Dropdown>
  );
}

function SessionSort() {
  const { t } = useTranslation();
  const { searchStore, sessionStore } = useStore();
  const onSessionSort = sessionStore.sortSessions;
  const { sort, order } = searchStore.instance;
  const onSort = ({ key }: { key: string }) => {
    const [sort, order] = key.split('-');
    const sign = order === 'desc' ? -1 : 1;
    searchStore.applyFilter({ order, sort });
    void searchStore.fetchSessions();
    onSessionSort(sort, sign);
  };

  const defaultOption = `${sort}-${order}`;

  return (
    <div className="px-[7px]">
      <SortDropdown
        defaultOption={defaultOption}
        onSort={onSort}
        sortOptions={sortOptions(t)}
        current={sortOptionsMap(t)[defaultOption]}
      />
    </div>
  );
}

export default observer(SessionSort);
