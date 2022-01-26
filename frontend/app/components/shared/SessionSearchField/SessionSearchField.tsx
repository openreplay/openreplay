import React, { useRef, useState } from 'react';
import { connect } from 'react-redux';
import stl from './SessionSearchField.css';
import { Input } from 'UI';
import FilterModal from 'Shared/EventFilter/FilterModal';
import { fetchList as fetchEventList } from 'Duck/events';
import { debounce } from 'App/utils';
import {
  addEvent, applyFilter, moveEvent, clearEvents,
  addCustomFilter, addAttribute, setSearchQuery, setActiveFlow, setFilterOption
} from 'Duck/filters';

interface Props {
  setSearchQuery: (query: string) => void;
  fetchEventList: (query: any) => void;
  searchQuery: string
}
function SessionSearchField(props: Props) {
  const debounceFetchEventList = debounce(props.fetchEventList, 1000)
  const [showModal, setShowModal] = useState(false)

  const onSearchChange = (e, { value }) => {
    // props.setSearchQuery(value)
    debounceFetchEventList({ q: value });
  }

  return (
    <div className="relative">
      <Input
        inputProps={ { "data-openreplay-label": "Search", "autocomplete": "off" } }
        className={stl.searchField}
        onFocus={ () => setShowModal(true) }
        onBlur={ () => setTimeout(setShowModal, 100, false) }
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

      <FilterModal
        close={ () => setShowModal(false) }
        displayed={ showModal }
        // displayed={ true }
        // loading={ loading }
        // searchedEvents={ searchedEvents }
        searchQuery={ props.searchQuery }
      />
    </div>
  );
}

export default connect(state => ({
  events: state.getIn([ 'filters', 'appliedFilter', 'events' ]),
  appliedFilter: state.getIn([ 'filters', 'appliedFilter' ]),
  searchQuery: state.getIn([ 'filters', 'searchQuery' ]),
  appliedFilterKeys: state.getIn([ 'filters', 'appliedFilter', 'filters' ])
    .map(({type}) => type).toJS(),
  searchedEvents: state.getIn([ 'events', 'list' ]),
  loading: state.getIn([ 'events', 'loading' ]),
  strict: state.getIn([ 'filters', 'appliedFilter', 'strict' ]),
  blink: state.getIn([ 'funnels', 'blink' ]),
}), { setSearchQuery, fetchEventList })(SessionSearchField);