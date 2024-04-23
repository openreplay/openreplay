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
    <Dropdown
      menu={{
        items: sortOptions,
        defaultSelectedKeys: [defaultOption],
        onClick: onSort,
      }}
    >
      <div
        className={
          'cursor-pointer flex items-center justify-end gap-2 font-semibold'
        }
      >
        <div>{sortOptionsMap[defaultOption]}</div>
        <DownOutlined />
      </div>
    </Dropdown>
  );
}

export default connect(
  (state: any) => ({
    filter: state.getIn(['search', 'instance']),
  }),
  { sort, applyFilter }
)(SessionSort);
