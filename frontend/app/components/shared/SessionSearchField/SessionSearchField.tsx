import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Input } from 'UI';
import FilterModal from 'Shared/Filters/FilterModal';
import { debounce } from 'App/utils';
import { assist as assistRoute, isRoute } from 'App/routes';
import { addFilterByKeyAndValue, fetchFilterSearch } from 'Duck/search';
import {
  addFilterByKeyAndValue as liveAddFilterByKeyAndValue,
  fetchFilterSearch as liveFetchFilterSearch,
} from 'Duck/liveSearch';
const ASSIST_ROUTE = assistRoute();

interface Props {
  fetchFilterSearch: (query: any) => void;
  addFilterByKeyAndValue: (key: string, value: string) => void;
  liveAddFilterByKeyAndValue: (key: string, value: string) => void;
  liveFetchFilterSearch: any;
}
function SessionSearchField(props: Props) {
  const isLive =
    isRoute(ASSIST_ROUTE, window.location.pathname) ||
    window.location.pathname.includes('multiview');
  const debounceFetchFilterSearch = React.useCallback(
    debounce(isLive ? props.liveFetchFilterSearch : props.fetchFilterSearch, 1000),
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
      ? props.liveAddFilterByKeyAndValue(filter.key, filter.value)
      : props.addFilterByKeyAndValue(filter.key, filter.value);
  };

  return (
    <div className="relative">
      <Input
        icon="search"
        onFocus={() => setShowModal(true)}
        onBlur={() => setTimeout(setShowModal, 200, false)}
        onChange={onSearchChange}
        placeholder={'Search sessions using any captured event (click, input, page, error...)'}
        id="search"
        type="search"
        autoComplete="off"
        className="hover:border-gray-medium text-lg placeholder-lg"
      />

      {showModal && (
        <div className="absolute left-0 border shadow rounded bg-white z-50">
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

export default connect(null, {
  addFilterByKeyAndValue,
  fetchFilterSearch,
  liveFetchFilterSearch,
  liveAddFilterByKeyAndValue,
})(SessionSearchField);
