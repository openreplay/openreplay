import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { connect } from 'react-redux';
import { addFilterByKeyAndValue, addFilter } from 'Duck/search';
import { getFilterKeyTypeByKey, setQueryParamKeyFromFilterkey } from 'Types/filter/filterType';
import { filtersMap } from 'App/types/filter/newFilter';
import Filter from 'Types/filter/filter';
import { applyFilter } from 'Duck/search';

interface Props {
  appliedFilter: any;
  applyFilter: any;
  addFilterByKeyAndValue: typeof addFilterByKeyAndValue;
  addFilter: typeof addFilter;
}
const SessionSearchQueryParamHandler = React.memo((props: Props) => {
  const { appliedFilter } = props;
  const history = useHistory();

  const createUrlQuery = (filters: any) => {
    const query: any = [];
    filters.forEach((filter: any) => {
      const item: any = {};
      if (filter.value.length > 0) {
        const _key = setQueryParamKeyFromFilterkey(filter.key);
        if (_key) {
          let str = `${filter.operator}|${filter.value.join('|')}`;
          if (filter.hasSource) {
            str = `${str}^${filter.sourceOperator}|${filter.source.join('|')}`;
          }
          item.key = _key + '[]';
          item.value = str;
        } else {
          let str = `${filter.operator}|${filter.value.join('|')}`;
          item.key = [filter.key] + '[]';
          item.value = str;
        }

        query.push(item);
      }
      
    });
    return query;
  };

  const applyFilterFromQuery = () => {
    if (appliedFilter.filters.size > 0) {
      return;
    }
    const entires = getQueryObject(history.location.search);
    const _filters: any = { ...filtersMap };
    if (entires.length > 0) {
      const filters: any = [];
      entires.forEach((item: any) => {
        if (!item.key || !item.value) { return }
        const filter: any = {}
        const filterKey = getFilterKeyTypeByKey(item.key);
        const tmp = item.value.split('^');
        const valueArr = tmp[0].split('|');
        const operator = valueArr.shift();
        const sourceArr = tmp[1] ? tmp[1].split('|') : [];
        const sourceOperator = decodeURI(sourceArr.shift());
        

        if (filterKey) {
          filter.type = filterKey;
          filter.key = filterKey;
          filter.value = valueArr;
          filter.operator = operator;
          filter.source = sourceArr;
          filter.sourceOperator = sourceOperator;
          filters.push(filter);
        } else {
          const _filter = _filters[item.key];
          
          if (!!_filter) {
            _filter.type = _filter.key;
            _filter.key = _filter.key;
            _filter.value = valueArr;
            _filter.operator = operator;
            _filter.source = sourceArr;
            filter.sourceOperator = sourceOperator;
          }
        }
      });
      const f = Filter({ filters })
      props.applyFilter(f);
    }
  };

  const generateUrlQuery = () => {
    const query: any = createUrlQuery(appliedFilter.filters);

    let queryString = query.reduce((acc: any, curr: any, index: any) => {
      acc += `${curr.key}=${curr.value}`;
      if (index < query.length - 1) {
        acc += '&';
      }
      return acc;
    }, '');
    
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
  { addFilterByKeyAndValue, addFilter, applyFilter }
)(SessionSearchQueryParamHandler);

function getQueryObject(search: any) {
  let jsonArray = search.slice(1).split('&').map((item: any) => {
    let [key, value] = item.split('=');
    return {key: key.slice(0, -2), value};
  });
  return jsonArray;
}
