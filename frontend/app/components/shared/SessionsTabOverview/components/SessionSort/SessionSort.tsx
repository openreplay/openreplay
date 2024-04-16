import { Select } from 'antd';
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
  value,
  label,
}));

interface Props {
  filter: any;
  options?: any;
  applyFilter: (filter: any) => void;
  sort: (sort: string, sign: number) => void;
}

function SessionSort(props: Props) {
  const { sort, order } = props.filter;
  const onSort = (value: string) => {
    const [sort, order] = value.split('-');
    const sign = order === 'desc' ? -1 : 1;
    props.applyFilter({ order, sort });
    props.sort(sort, sign);
  };

  const defaultOption = `${sort}-${order}`;
  return (
    <Select
      style={{ width: 160 }}
      options={sortOptions}
      onChange={onSort}
      defaultValue={defaultOption}
    />
  );
}

export default connect(
  (state: any) => ({
    filter: state.getIn(['search', 'instance']),
  }),
  { sort, applyFilter }
)(SessionSort);
