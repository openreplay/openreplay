import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { connect } from 'react-redux';
import { addFilterByKeyAndValue, addFilter } from 'Duck/search';
import { applyFilter } from 'Duck/search';
import { createUrlQuery, getFiltersFromQuery } from 'App/utils/search';

interface Props {
  appliedFilter: any;
  applyFilter: any;
  addFilterByKeyAndValue: typeof addFilterByKeyAndValue;
  addFilter: typeof addFilter;
}
const SessionSearchQueryParamHandler = (props: Props) => {
  const { appliedFilter } = props;
  const history = useHistory();

  const applyFilterFromQuery = () => {
    const filter = getFiltersFromQuery(history.location.search, appliedFilter);
    props.applyFilter(filter, true);
  };

  const generateUrlQuery = () => {
    const search: any = createUrlQuery(appliedFilter);
    history.replace({ search });
  };

  useEffect(applyFilterFromQuery, []);
  useEffect(generateUrlQuery, [appliedFilter]);
  
  return <></>;
};

export default connect(
  (state: any) => ({
    appliedFilter: state.getIn(['search', 'instance']),
  }),
  { addFilterByKeyAndValue, addFilter, applyFilter }
)(SessionSearchQueryParamHandler);
