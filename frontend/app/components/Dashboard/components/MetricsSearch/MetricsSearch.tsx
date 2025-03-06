import { useObserver } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { Input } from 'antd';
import { debounce } from 'App/utils';
import { useTranslation } from 'react-i18next';

let debounceUpdate: any = () => {};
function MetricsSearch() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const [query, setQuery] = useState(metricStore.filter.query);
  useEffect(() => {
    debounceUpdate = debounce(
      (key: any, value: any) =>
        metricStore.updateKey('filter', {
          ...metricStore.filter,
          query: value,
        }),
      500,
    );
  }, []);

  const write = ({ target: { value } }: any) => {
    setQuery(value);
    debounceUpdate('metricsSearch', value);
  };

  return useObserver(() => (
    <div className="relative">
      <Input.Search
        value={query}
        allowClear
        name="metricsSearch"
        className="w-full input-search-card"
        placeholder={t('Filter by title or owner')}
        onChange={write}
      />
    </div>
  ));
}

export default MetricsSearch;
