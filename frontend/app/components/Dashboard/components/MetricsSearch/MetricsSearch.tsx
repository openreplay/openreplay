import { useObserver } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { debounce } from 'App/utils';

let debounceUpdate: any = () => {};
function MetricsSearch() {
  const { metricStore } = useStore();
  const [query, setQuery] = useState(metricStore.filter.query);
  useEffect(() => {
    debounceUpdate = debounce(
      (key: any, value: any) => metricStore.updateKey('filter', { ...metricStore.filter, query: value }),
      500
    );
  }, []);

  const write = ({ target: { value } }: any) => {
    setQuery(value);
    debounceUpdate('metricsSearch', value);
  };

  return useObserver(() => (
    <div className="relative">
      <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="16" />
      <input
        value={query}
        name="metricsSearch"
        className="bg-white p-2 border border-borderColor-gray-light-shade rounded w-full pl-10"
        placeholder="Filter by title and owner"
        onChange={write}
      />
    </div>
  ));
}

export default MetricsSearch;
