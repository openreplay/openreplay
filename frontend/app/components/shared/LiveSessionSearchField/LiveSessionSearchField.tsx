import React, { useState } from 'react';
import { connect } from 'react-redux';
import stl from './LiveSessionSearchField.module.css';
import { Input } from 'UI';
import LiveFilterModal from 'Shared/Filters/LiveFilterModal';
import { fetchFilterSearch } from 'Duck/search';
import { debounce } from 'App/utils';
import { edit as editFilter, addFilterByKeyAndValue } from 'Duck/liveSearch';

interface Props {
  fetchFilterSearch: (query: any) => void;
  editFilter: typeof editFilter;
  addFilterByKeyAndValue: (key: string, value: string) => void;
}
function LiveSessionSearchField(props: Props) {
  const debounceFetchFilterSearch = debounce(props.fetchFilterSearch, 1000)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const onSearchChange = (e, { value }) => {
    setSearchQuery(value)
    debounceFetchFilterSearch({ q: value });
  }

  const onAddFilter = (filter) => {
    props.addFilterByKeyAndValue(filter.key, filter.value)
  }

  return (
    <div className="relative">
      <Input
        // inputProps={ { "data-openreplay-label": "Search", "autocomplete": "off" } }
        className={stl.searchField}
        onFocus={ () => setShowModal(true) }
        onBlur={ () => setTimeout(setShowModal, 200, false) }
        onChange={ onSearchChange }
        icon="search"
        placeholder={ 'Find live sessions by user or metadata.'}
        fluid
        id="search"
        type="search"
        autoComplete="off"
      />

      { showModal && (
        <div className="absolute left-0 border shadow rounded bg-white z-50">
          <LiveFilterModal
            searchQuery={searchQuery}
            isMainSearch={true}
            onFilterClick={onAddFilter}
          />
        </div>
      )}
    </div>
  );
}

export default connect(null, { fetchFilterSearch, editFilter, addFilterByKeyAndValue })(LiveSessionSearchField);
