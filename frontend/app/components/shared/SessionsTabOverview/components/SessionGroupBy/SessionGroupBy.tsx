import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import Select from 'Shared/Select';
import { applyFilter } from 'Duck/search';
import { fetchList } from 'Duck/customField';

interface Props {
  filter: any;
  fields: any[];
  applyFilter: (filter: any) => void;
}

function SessionGroupBy(props: Props) {
  const {
    filter: { groupBy },
    fields,
  } = props;
  const onGroupBy = ({ value }: any) => {
    const metadata_name = value?.value;
    props.applyFilter({ groupBy: metadata_name });
  };

  const groupByOptions = fields
    ? fields.map((field: any, index: number) => ({
        value: field.key,
        label: field.key,
      }))
    : [];

  return (
    <Select
      name="groupSessions"
      plain
      right
      isClearable
      placeholder="Group by"
      options={groupByOptions}
      onChange={onGroupBy}
      defaultValue={groupBy}
    />
  );
}

export default connect(
  (state: any) => ({
    filter: state.getIn(['search', 'instance']),
    fields: state.getIn(['customFields', 'list']).sortBy((i: any) => i.index),
  }),
  { applyFilter }
)(SessionGroupBy);
