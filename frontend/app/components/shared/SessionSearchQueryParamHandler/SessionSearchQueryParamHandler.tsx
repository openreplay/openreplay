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
const SessionSearchQueryParamHandler = React.memo((props: Props) => {
  const { appliedFilter } = props;
  const history = useHistory();

  const createUrlQuery = (filters: any) => {
    const query: any = {};
    filters.forEach((filter: any) => {
      if (filter.value.length > 0) {
        const _key = setQueryParamKeyFromFilterkey(filter.key);
        let str = `${filter.operator}|${filter.value.join('|')}`;
        if (filter.hasSource) {
          str = `${str}^${filter.sourceOperator}|${filter.source.join('|')}`;
        }
        query[_key] = str;
      }
    });
    return query;
  };

  const addFilter = ([key, value]: [string, string]): void => {
    if (value !== '') {
      const filterKey = getFilterKeyTypeByKey(key);
      const tmp = value.split('^');
      const valueArr = tmp[0].split('|');
      const operator = valueArr.shift();
      const sourceArr = tmp[1] ? tmp[1].split('|') : [];
      const sourceOperator = sourceArr.shift();
      const source = sourceArr;
      // TODO validate operator
      if (filterKey) {
        props.addFilterByKeyAndValue(filterKey, valueArr, operator, sourceOperator, source);
      }
    }
  };

  const applyFilterFromQuery = () => {
    const entires = getQueryObject(history.location.search);
    if (entires.length > 0) {
      entires.forEach(addFilter);
    }
  };

  const generateUrlQuery = () => {
    const query: any = createUrlQuery(appliedFilter.filters);
    const queryString = new URLSearchParams(query).toString();
    history.replace({ search: queryString });
  };

  useEffect(applyFilterFromQuery, []);
  useEffect(generateUrlQuery, [appliedFilter]);
  return <></>;
});

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
