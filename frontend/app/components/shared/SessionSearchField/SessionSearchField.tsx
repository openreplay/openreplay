import React, { useState } from 'react';
import { connect } from 'react-redux';
import stl from './SessionSearchField.css';
import { Input } from 'UI';
import FilterModal from 'Shared/Filters/FilterModal';
import { fetchFilterSearch } from 'Duck/search';
import { debounce } from 'App/utils';
import { edit as editFilter, addFilterByKeyAndValue } from 'Duck/search';

interface Props {
  fetchFilterSearch: (query: any) => void;
  editFilter: typeof editFilter;
  addFilterByKeyAndValue: (key: string, value: string) => void;
}
function SessionSearchField(props: Props) {
  const debounceFetchFilterSearch = React.useCallback(debounce(props.fetchFilterSearch, 1000), []);
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
        iconPosition="left"
        placeholder={ 'Search sessions using any captured event (click, input, page, error...)'}
        fluid
        id="search"
        type="search"
        autoComplete="off"
      />

      { showModal && (
        <div className="absolute left-0 top-20 border shadow rounded bg-white z-50">
          <FilterModal
            searchQuery={searchQuery}
            isMainSearch={true}
            onFilterClick={onAddFilter}
          />
        </div>
      )}
    </div>
  );
}

export default connect(null, { fetchFilterSearch, editFilter, addFilterByKeyAndValue })(SessionSearchField);