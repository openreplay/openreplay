import React, { useEffect, useState } from 'react';
import { Icon } from 'UI';
import { debounce } from 'App/utils';
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite'

let debounceUpdate: any = () => {};

function AlertsSearch() {
  const { alertsStore } = useStore();
  const [inputValue, setInputValue] = useState(alertsStore.alertsSearch);

  useEffect(() => {
    debounceUpdate = debounce((value: string) => alertsStore.changeSearch(value), 500);
  }, []);

  const write = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(value);
    debounceUpdate(value);
  };

  return (
    <div className="relative">
      <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="16" />
      <input
        value={inputValue}
        name="alertsSearch"
        className="bg-white p-2 border border-borderColor-gray-light-shade rounded w-full pl-10"
        placeholder="Filter by title"
        onChange={write}
      />
    </div>
  );
}

export default observer(AlertsSearch);
