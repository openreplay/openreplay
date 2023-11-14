import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import Select from 'Shared/Select';
import { applyFilter } from 'Duck/search';
import { fetchList } from 'Duck/customField';

interface Props {
  filter: any;
  site: any;
  fields: any[];
  applyFilter: (filter: any) => void;
  fetchList: (siteId: string) => void;
}

function SessionGroupBy(props: Props) {
  const {
    filter: { groupBy },
    site,
    fields,
  } = props;
  const onGroupBy = ({ value }: any) => {
    const metadata_name = value.value;
    props.applyFilter({ groupBy: metadata_name });
  };

  useEffect(() => {
    props.fetchList(site.id);
  }, []);

  const groupByOptions = fields
    ? fields.map((field: any, index: number) => ({
        value: field.key,
        label: field.key,
      }))
    : [];

  console.log(fields);

  const defaultOption = groupBy;
  return (
    <Select
      name="groupSessions"
      plain
      right
      placeholder="Group by"
      options={groupByOptions}
      onChange={onGroupBy}
      defaultValue={defaultOption}
    />
  );
}

export default connect(
  (state: any) => ({
    site: state.getIn(['site', 'instance']),
    filter: state.getIn(['search', 'instance']),
    fields: state.getIn(['customFields', 'list']).sortBy((i: any) => i.index),
  }),
  { fetchList, applyFilter }
)(SessionGroupBy);
