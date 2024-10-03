import React, { useState } from 'react';
import { Input } from 'UI';
import FilterModal from 'Shared/Filters/FilterModal';
import { debounce } from 'App/utils';
import { assist as assistRoute, isRoute } from 'App/routes';

const ASSIST_ROUTE = assistRoute();
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

interface Props {

}

function SessionSearchField(props: Props) {
  const { searchStore, searchStoreLive } = useStore();
  const isLive =
    isRoute(ASSIST_ROUTE, window.location.pathname) ||
    window.location.pathname.includes('multiview');
  const debounceFetchFilterSearch = React.useCallback(
    debounce(isLive ? searchStoreLive.fetchFilterSearch : searchStore.fetchFilterSearch, 1000),
    []
  );
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onSearchChange = ({ target: { value } }: any) => {
    setSearchQuery(value);
    debounceFetchFilterSearch({ q: value });
  };

  const onAddFilter = (filter: any) => {
    isLive
      ? searchStoreLive.addFilterByKeyAndValue(filter.key, filter.value)
      : searchStore.addFilterByKeyAndValue(filter.key, filter.value);
  };

  return (
    <div className="relative">
      <Input
        icon="search"
        onFocus={() => setShowModal(true)}
        onBlur={() => setTimeout(setShowModal, 200, false)}
        onChange={onSearchChange}
        placeholder={'Search sessions using any captured event (click, input, page, error...)'}
        style={{ minWidth: 360 }}
        id="search"
        type="search"
        autoComplete="off"
        className="hover:border-gray-medium text-lg placeholder-lg h-9 shadow-sm"
      />

      {showModal && (
        <div className="absolute left-0 shadow-sm rounded-lg bg-white z-50">
          <FilterModal
            searchQuery={searchQuery}
            isMainSearch={true}
            onFilterClick={onAddFilter}
            isLive={isLive}
          />
        </div>
      )}
    </div>
  );
}

export default observer(SessionSearchField);
