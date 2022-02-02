import React, { useRef, useState } from 'react';
import { connect } from 'react-redux';
import stl from './SessionSearchField.css';
import { Input } from 'UI';
import FilterModal from 'Shared/Filters/FilterModal';
// import { fetchList as fetchFilterSearch } from 'Duck/events';
import { fetchFilterSearch } from 'Duck/search';
import { debounce } from 'App/utils';
import { edit as editFilter } from 'Duck/search';
import {
  addEvent, applyFilter, moveEvent, clearEvents,
  addCustomFilter, addAttribute, setSearchQuery, setActiveFlow, setFilterOption
} from 'Duck/filters';

interface Props {
  setSearchQuery: (query: string) => void;
  fetchFilterSearch: (query: any) => void;
  searchQuery: string;
  appliedFilter: any;
  editFilter: typeof editFilter;
}
function SessionSearchField(props: Props) {
  const { appliedFilter } = props;
  const debounceFetchFilterSearch = debounce(props.fetchFilterSearch, 1000)
  const [showModal, setShowModal] = useState(false)

  const onSearchChange = (e, { value }) => {
    // props.setSearchQuery(value)
    debounceFetchFilterSearch({ q: value });
  }

  const onAddFilter = (filter) => {
    filter.value = [""]
    const newFilters = appliedFilter.filters.concat(filter);
    props.editFilter({
        ...appliedFilter.filter,
        filters: newFilters,
    });
  }

  return (
    <div className="relative">
      <Input
        inputProps={ { "data-openreplay-label": "Search", "autocomplete": "off" } }
        className={stl.searchField}
        onFocus={ () => setShowModal(true) }
        onBlur={ () => setTimeout(setShowModal, 200, false) }
        // ref={ this.inputRef }
        onChange={ onSearchChange }
        // onKeyUp={this.onKeyUp}
        // value={props.searchQuery}
        icon="search"
        iconPosition="left"
        placeholder={ 'Search sessions using any captured event (click, input, page, error...)'}
        fluid
        id="search"
        type="search"
        autocomplete="off"
      />

      {/* <FilterModal
        close={ () => setShowModal(false) }
        displayed={ showModal }
        // displayed={ true }
        // loading={ loading }
        // searchedEvents={ searchedEvents }
        searchQuery={ props.searchQuery }
      /> */}
      { showModal && (
        <div className="absolute left-0 top-20 border shadow rounded bg-white z-50">
          <FilterModal
            onFilterClick={onAddFilter}
          />
        </div>
      )}
    </div>
  );
}

export default connect(state => ({
  events: state.getIn([ 'filters', 'appliedFilter', 'events' ]),
  // appliedFilter: state.getIn([ 'filters', 'appliedFilter' ]),
  searchQuery: state.getIn([ 'filters', 'searchQuery' ]),
  appliedFilterKeys: state.getIn([ 'filters', 'appliedFilter', 'filters' ])
    .map(({type}) => type).toJS(),
  searchedEvents: state.getIn([ 'events', 'list' ]),
  loading: state.getIn([ 'events', 'loading' ]),
  strict: state.getIn([ 'filters', 'appliedFilter', 'strict' ]),
  blink: state.getIn([ 'funnels', 'blink' ]),
  appliedFilter: state.getIn(['search', 'instance']),
}), { setSearchQuery, fetchFilterSearch, editFilter })(SessionSearchField);