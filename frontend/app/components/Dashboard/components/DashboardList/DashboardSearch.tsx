import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { debounce } from 'App/utils';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';

let debounceUpdate: any = () => {};

function DashboardSearch() {
  const { t } = useTranslation();
  const { dashboardStore } = useStore();
  const [query, setQuery] = useState(dashboardStore.dashboardsSearch);
  useEffect(() => {
    debounceUpdate = debounce(
      (key: string, value: any) =>
        dashboardStore.updateKey('filter', {
          ...dashboardStore.filter,
          query: value,
        }),
      500,
    );
  }, []);

  // @ts-ignore
  const write = ({ target: { value } }) => {
    setQuery(value);
    debounceUpdate('dashboardsSearch', value);
  };

  return (
    <Input.Search
      value={query}
      allowClear
      name="dashboardsSearch"
      className="w-full btn-search-dashboard"
      placeholder={t('Filter by dashboard title')}
      onChange={write}
      onSearch={(value) =>
        dashboardStore.updateKey('filter', {
          ...dashboardStore.filter,
          query: value,
        })
      }
    />
  );
}

export default observer(DashboardSearch);
