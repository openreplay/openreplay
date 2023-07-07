import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { debounce } from 'App/utils';

let debounceUpdate: any = () => {};

function FFlagsSearch() {
  const { featureFlagsStore } = useStore();
  const [query, setQuery] = useState(featureFlagsStore.sort.query);

  useEffect(() => {
    debounceUpdate = debounce(
      (value: string) => {
        featureFlagsStore.setSort({ order: featureFlagsStore.sort.order, query: value })
        featureFlagsStore.setPage(1)
        void featureFlagsStore.fetchFlags()
      },
      250
    );
  }, []);

  const write = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(value.replace(/\s/g, '-'));
    debounceUpdate(value.replace(/\s/g, '-'));
  };

  return (
    <div className="relative">
      <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="16" />
      <input
        value={query}
        name="flagsSearch"
        className="bg-white p-2 border border-borderColor-gray-light-shade rounded w-full pl-10"
        placeholder="Search by key"
        onChange={write}
      />
    </div>
  );
}

export default observer(FFlagsSearch);
