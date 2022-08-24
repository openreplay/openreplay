import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { connect } from 'react-redux';
import { addFilterByKeyAndValue, addFilter } from 'Duck/search';
import { getFilterKeyTypeByKey, setQueryParamKeyFromFilterkey } from 'Types/filter/filterType';
import { filtersMap } from 'App/types/filter/newFilter';

interface Props {
  appliedFilter: any;
  addFilterByKeyAndValue: typeof addFilterByKeyAndValue;
  addFilter: typeof addFilter;
}
const SessionSearchQueryParamHandler = React.memo((props: Props) => {
  const { appliedFilter } = props;
  const history = useHistory();

  const createUrlQuery = (filters: any) => {
    const query: any = {};
    filters.forEach((filter: any) => {
      if (filter.value.length > 0) {
        const _key = setQueryParamKeyFromFilterkey(filter.key);
        if (_key) {
          let str = `${filter.operator}|${filter.value.join('|')}`;
          if (filter.hasSource) {
            str = `${str}^${filter.sourceOperator}|${filter.source.join('|')}`;
          }
          query[_key] = str;
        } else {
          let str = `${filter.operator}|${filter.value.join('|')}`;
          query[filter.key] = str;
        }
      }
    });
    return query;
  };

  const addFilter = ([key, value]: [any, any]): void => {
    if (value !== '') {
      const filterKey = getFilterKeyTypeByKey(key);
      const tmp = value.split('^');
      const valueArr = tmp[0].split('|');
      const operator = valueArr.shift();

      const sourceArr = tmp[1] ? tmp[1].split('|') : [];
      const sourceOperator = sourceArr.shift();
      // TODO validate operator
      if (filterKey) {
        props.addFilterByKeyAndValue(filterKey, valueArr, operator, sourceOperator, sourceArr);
      } else {
        const _filters: any = { ...filtersMap };
        const _filter = _filters[key];
        _filter.value = valueArr;
        _filter.operator = operator;
        _filter.source = sourceArr;
        props.addFilter(_filter);
      }
    }
  };

  const applyFilterFromQuery = () => {
    if (appliedFilter.filters.size > 0) {
      return;
    }
    const entires = getQueryObject(history.location.search);
    if (entires.length > 0) {
      entires.forEach(addFilter);
    }
  };

  const generateUrlQuery = () => {
    const query: any = createUrlQuery(appliedFilter.filters);
    // const queryString = Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&');
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
  { addFilterByKeyAndValue, addFilter }
)(SessionSearchQueryParamHandler);

function getQueryObject(search: any) {
  const queryParams = Object.fromEntries(
    Object.entries(Object.fromEntries(new URLSearchParams(search)))
  );
  return Object.entries(queryParams);
}
