import { getFilterKeyTypeByKey, setQueryParamKeyFromFilterkey } from 'Types/filter/filterType';
import Period, { CUSTOM_RANGE } from 'Types/app/period';
import Filter from 'Types/filter/filter';
import { filtersMap } from 'Types/filter/newFilter';

type QueryItem = {
  key: any;
  value: string;
};

export const createUrlQuery = (filter: {
  filters: any[];
  rangeValue: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  order?: string;
  groupBy?: string;
}) => {
  const query: QueryItem[] = [];
  if (!filter) {
    return '';
  }
  filter.filters.forEach((f: any) => {
    if (!f.value.length) {
      return;
    }

    let str = `${f.operator}|${f.value.join('|')}`;
    if (f.hasSource) {
      const sourceOperator = f.sourceOperator || '';
      const source = f.source ? f.source.join('|') : '';
      str = `${str}^${sourceOperator}|${source}`;
    }

    let key: any = setQueryParamKeyFromFilterkey(f.key);
    if (!key) {
      key = [f.key];
    }

    query.push({ key, value: str });
  });

  query.push({ key: 'range', value: filter.rangeValue });
  if (filter.rangeValue === CUSTOM_RANGE) {
    query.push({ key: 'rStart', value: filter.startDate! });
    query.push({ key: 'rEnd', value: filter.endDate! });
  }

  if (filter.sort && filter.order) {
    query.push({ key: 'sort', value: filter.sort });
    query.push({ key: 'order', value: filter.order });
  }

  if (filter.groupBy) {
    query.push({ key: 'groupBy', value: filter.groupBy });
  }

  return query.map(({ key, value }) => `${key}=${value}`).join('&');
};

export const getFiltersFromQuery = (search: string) => {
  if (!search) {
    return Filter();
  }

  const entires = getQueryObject(search);
  const period: any = getPeriodFromEntries(entires);
  const filters = getFiltersFromEntries(entires);

  const { sort, order } = getSortFromEntries(entires);
  const groupBy = getGroupByFromEntries(entires);
  return Filter({
    filters,
    rangeValue: period.rangeName,
    sort,
    order,
    groupBy,
  });
};

const getFiltersFromEntries = (entires: any) => {
  const _filters: any = { ...filtersMap };
  const filters: any = [];
  if (entires.length > 0) {
    entires.forEach((item: any) => {
      if (!item.key || !item.value) {
        return;
      }

      let filter: any = {};
      const filterKey = getFilterKeyTypeByKey(item.key);
      const tmp = item.value.split('^');
      const valueArr = tmp[0].split('|');
      const operator = valueArr.shift();
      const sourceArr = tmp[1] ? tmp[1].split('|') : [];
      const sourceOperator = sourceArr.shift();

      if (filterKey) {
        filter.type = filterKey;
        filter.key = filterKey;
      } else {
        filter = _filters[item.key];
        if (!!filter) {
          filter.type = filter.key;
          filter.key = filter.key;
        }
      }

      if (!filter) {
        return;
      }

      filter.value = valueArr;
      filter.operator = operator;
      if (filter.icon === 'filters/metadata') {
        filter.source = filter.type;
        filter.type = 'MULTIPLE';
      } else {
        filter.source = sourceArr && sourceArr.length > 0 ? sourceArr : null;
        filter.sourceOperator = !!sourceOperator ? decodeURI(sourceOperator) : null;
      }

      if (!filter.filters || filter.filters.size === 0) {
        // TODO support subfilters in url
        filters.push(filter);
      }
    });
  }
  return filters;
};

const getPeriodFromEntries = (entires: any) => {
  const rangeFilter = entires.find(({ key }: any) => key === 'range');
  if (!rangeFilter) {
    return Period();
  }

  if (rangeFilter.value === CUSTOM_RANGE) {
    const start = entires.find(({ key }: any) => key === 'rStart').value;
    const end = entires.find(({ key }: any) => key === 'rEnd').value;
    return Period({ rangeName: rangeFilter.value, start, end });
  }

  return Period({ rangeName: rangeFilter.value });
};

const getSortFromEntries = (entires: any) => {
  const sort = entires.find(({ key }: any) => key === 'sort');
  const order = entires.find(({ key }: any) => key === 'order');

  if (!sort || !order) {
    return { sort: 'startTs', order: 'desc' };
  }

  return { sort: sort.value, order: order.value };
};

const getGroupByFromEntries = (entires: any) => {
  const groupBy = entires.find(({ key }: any) => key === 'groupBy');
  return groupBy?.value;
};

function getQueryObject(search: any) {
  let jsonArray = search
    .slice(1)
    .split('&')
    .map((item: any) => {
      let [key, value] = item.split('=');
      key = key.replace('[]', '');
      return { key: key, value: decodeURI(value) };
    });
  return jsonArray;
}
