import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { connect } from 'react-redux';
import { addFilterByKeyAndValue } from 'Duck/search';
import { getFilterKeyTypeByKey, setQueryParamKeyFromFilterkey } from 'Types/filter/filterType';

const allowedQueryKeys = [
  'userId',
  'userid',
  'uid',
  'usera',

  'clk',
  'inp',
  'loc',

  'os',
  'browser',
  'device',
  'platform',
  'revid',

  'country',

  // 'startDate',
  // 'endDate',
  // 'minDuration',
  // 'maxDuration',
  'ref',
  'sort',
  'order',
  'ce',
  'sa',
  'err',
  'iss',

  // PERFORMANCE
  'domc',
  'lcp',
  'ttfb',
  'acpu',
  'amem',
  'ff',
];

interface Props {
  appliedFilter: any;
  addFilterByKeyAndValue: typeof addFilterByKeyAndValue;
}
function SessionSearchQueryParamHandler(props: Props) {
  const { appliedFilter } = props;
  const history = useHistory();

  const createUrlQuery = (filters: any) => {
    const query: any = {};
    filters.forEach((filter: any) => {
      if (filter.value.length > 0) {
        const _key = setQueryParamKeyFromFilterkey(filter.key);
        query[_key] = `${filter.operator}|${filter.value.join('|')}`;
      }
    });
    return query;
  };

  const addFilter = ([key, value]: [string, string]): void => {
    if (value !== '') {
      const filterKey = getFilterKeyTypeByKey(key);
      const valueArr = value.split('|');
      const operator = valueArr.shift();
      // TODO validate operator
      if (filterKey) {
        props.addFilterByKeyAndValue(filterKey, valueArr, operator);
      }
    }
  };

  const applyFilterFromQuery = () => {
    const entires = getQueryObject(history.location.search);
    if (entires.length > 0) {
      entires.forEach(addFilter);
    }
  };

  useEffect(() => {
    applyFilterFromQuery();
  }, []);

  useEffect(() => {
    const query: any = createUrlQuery(appliedFilter.filters);
    history.replace({ search: new URLSearchParams(query).toString() });
  }, [appliedFilter]);
  return <></>;
}

export default connect(
  (state: any) => ({
    appliedFilter: state.getIn(['search', 'instance']),
  }),
  { addFilterByKeyAndValue }
)(SessionSearchQueryParamHandler);

function getQueryObject(search: any) {
  const queryParams = Object.fromEntries(
    Object.entries(Object.fromEntries(new URLSearchParams(search))).filter(([key]) =>
      allowedQueryKeys.includes(key)
    )
  );
  return Object.entries(queryParams);
}
