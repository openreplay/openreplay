import React, { useState } from 'react';
import { Input } from 'UI';
import LiveFilterModal from 'Shared/Filters/LiveFilterModal';
import { debounce } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import stl from './LiveSessionSearchField.module.css';

interface Props {}

function LiveSessionSearchField(props: Props) {
  const { searchStoreLive } = useStore();
  const debounceFetchFilterSearch = debounce(
    searchStoreLive.fetchFilterSearch,
    1000,
  );
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onSearchChange = (e, { value }) => {
    setSearchQuery(value);
    debounceFetchFilterSearch({ q: value });
  };

  const onAddFilter = (filter) => {
    searchStoreLive.addFilterByKeyAndValue(filter.key, filter.value);
  };

  return (
    <div className="relative">
      <Input
        // inputProps={ { "data-openreplay-label": "Search", "autocomplete": "off" } }
        className={stl.searchField}
        onFocus={() => setShowModal(true)}
        onBlur={() => setTimeout(setShowModal, 200, false)}
        onChange={onSearchChange}
        icon="search"
        placeholder="Find live sessions by user or metadata."
        fluid
        id="search"
        type="search"
        autoComplete="off"
      />

      {showModal && (
        <div className="absolute left-0 shadow-sm rounded-lg bg-white z-50">
          <LiveFilterModal
            searchQuery={searchQuery}
            isMainSearch
            onFilterClick={onAddFilter}
          />
        </div>
      )}
    </div>
  );
}

export default observer(LiveSessionSearchField);
