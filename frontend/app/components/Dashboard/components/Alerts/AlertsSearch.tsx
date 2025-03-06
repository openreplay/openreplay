import React, { useEffect, useState } from 'react';
import { Icon } from 'UI';
import { Input } from 'antd';
import { debounce } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

let debounceUpdate: any = () => {};

function AlertsSearch() {
  const { t } = useTranslation();
  const { alertsStore } = useStore();
  const [inputValue, setInputValue] = useState(alertsStore.alertsSearch);

  useEffect(() => {
    debounceUpdate = debounce(
      (value: string) => alertsStore.changeSearch(value),
      500,
    );
  }, []);

  const write = ({
    target: { value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(value);
    debounceUpdate(value);
  };

  return (
    <div className="relative">
      <Icon
        name="search"
        className="absolute top-0 bottom-0 ml-2 m-auto"
        size="16"
      />
      <Input.Search
        value={inputValue}
        allowClear
        name="alertsSearch"
        className="w-full"
        placeholder={t('Filter by alert title')}
        onChange={write}
      />
    </div>
  );
}

export default observer(AlertsSearch);
