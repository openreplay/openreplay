import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import React from 'react';
import { connect } from 'react-redux';

import { applyFilter } from 'Duck/search';
import { sort } from 'Duck/sessions';

const sortOptionsMap = {
  'startTs-desc': 'Newest',
  'startTs-asc': 'Oldest',
  'eventsCount-asc': 'Events Ascending',
  'eventsCount-desc': 'Events Descending',
};

const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({
  // value,
  label,
  key: value,
}));

interface Props {
  filter: any;
  options?: any;
  applyFilter: (filter: any) => void;
  sort: (sort: string, sign: number) => void;
}

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
        onClick: onSort,
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
  )
}

function SessionSort(props: Props) {
  const { sort, order } = props.filter;
  const onSort = ({ key }: { key: string }) => {
    const [sort, order] = key.split('-');
    const sign = order === 'desc' ? -1 : 1;
    props.applyFilter({ order, sort });
    props.sort(sort, sign);
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

export default connect(
  (state: any) => ({
    filter: state.getIn(['search', 'instance']),
  }),
  { sort, applyFilter }
)(SessionSort);
