import { getFilterKeyTypeByKey, setQueryParamKeyFromFilterkey } from 'Types/filter/filterType';
import Period, { CUSTOM_RANGE } from 'Types/app/period';
import Filter from 'Types/filter/filter';
import { filtersMap } from 'Types/filter/newFilter';

type QueryItem = {
  key: any;
  value: string;
};

export const createUrlQuery = (filter: { filters: any[]; rangeValue: string; startDate?: string; endDate?: string }) => {
  const query: QueryItem[] = [];

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

  if (query.length > 0) {
    query.push({ key: 'range', value: filter.rangeValue });
    if (filter.rangeValue === CUSTOM_RANGE) {
      query.push({ key: 'rStart', value: filter.startDate! });
      query.push({ key: 'rEnd', value: filter.endDate! });
    }
  }

  return query.map(({ key, value }) => `${key}=${value}`).join('&');
};


export const getFiltersFromQuery = (search: string, filter: any) => {
  if (!search || filter.filters.size > 0) {
    return;
  }

  const entries = getQueryObject(search);
  const period: any = getPeriodFromEntries(entries);
  const filters = getFiltersFromEntries(entries);

  return Filter({ filters, rangeValue: period.rangeName, startDate: period.start, endDate: period.end });
};

const getFiltersFromEntries = (entries: any) => {
  const _filters: any = { ...filtersMap };
  const filters: any = [];
  if (entries.length > 0) {
    entries.forEach((item: any) => {
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

      if (filterKey && _filters[filterKey]) {
        filter = _filters[filterKey];
        filter.value = valueArr;
      } else {
        if (filterKey) {
          filter.type = filterKey;
          filter.key = filterKey;
        } else {
          filter = _filters[item.key];
          if (!!filter) {
            filter.type = filter.key;
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
      }

      if (!filter.filters || filter.filters.size === 0) {
        // TODO support subfilters in url
        filters.push(filter);
      }
    });
  }
  return filters;
};

const getPeriodFromEntries = (entries: any) => {
  const rangeFilter = entries.find(({ key }: any) => key === 'range');
  if (!rangeFilter) {
    return Period();
  }

  if (rangeFilter.value === CUSTOM_RANGE) {
    const start = entries.find(({ key }: any) => key === 'rStart').value;
    const end = entries.find(({ key }: any) => key === 'rEnd').value;
    return Period({ rangeName: rangeFilter.value, start, end });
  }

  return Period({ rangeName: rangeFilter.value });
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