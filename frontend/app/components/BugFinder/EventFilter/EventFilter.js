import { connect } from 'react-redux';
import { Input } from 'semantic-ui-react';
import { DNDContext } from 'Components/hocs/dnd';
import {
  addEvent, applyFilter, moveEvent, clearEvents,
  addCustomFilter, addAttribute, setSearchQuery, setActiveFlow, setFilterOption
} from 'Duck/filters';
import { fetchList as fetchEventList } from 'Duck/events';
import { debounce } from 'App/utils';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import EventEditor from './EventEditor';
import ListHeader from '../ListHeader';
import FilterModal from '../CustomFilters/FilterModal';
import { IconButton } from 'UI';
import stl from './eventFilter.css';
import Attributes from '../Attributes/Attributes';
import RandomPlaceholder from './RandomPlaceholder';
import CustomFilters from '../CustomFilters';
import ManageFilters from '../ManageFilters';
import { blink as setBlink }  from 'Duck/funnels';
import cn from 'classnames';

@connect(state => ({
  events: state.getIn([ 'filters', 'appliedFilter', 'events' ]),
  appliedFilter: state.getIn([ 'filters', 'appliedFilter' ]),
  searchQuery: state.getIn([ 'filters', 'searchQuery' ]),
  appliedFilterKeys: state.getIn([ 'filters', 'appliedFilter', 'filters' ])
    .map(({type}) => type).toJS(),
  searchedEvents: state.getIn([ 'events', 'list' ]),
  loading: state.getIn([ 'events', 'loading' ]),
  strict: state.getIn([ 'filters', 'appliedFilter', 'strict' ]),
  blink: state.getIn([ 'funnels', 'blink' ]),
}), {
  applyFilter,
  addEvent,
  moveEvent,
  fetchEventList,
  clearEvents,
  addCustomFilter,
  addAttribute,
  setSearchQuery,
  setActiveFlow,
  setFilterOption,
  setBlink
})
@DNDContext
export default class EventFilter extends React.PureComponent {
  state = { search: '', showFilterModal: false, showPlacehoder: true }
  fetchEventList = debounce(this.props.fetchEventList, 500)
  inputRef = React.createRef()

  componentDidUpdate(){
    const { blink, setBlink } = this.props;
    if (blink) {      
      setTimeout(function() {
        setBlink(false)
      }, 3000)
    }
  }

  onBlur = () => {
    const { searchQuery } = this.props;
    this.setState({ showPlacehoder: searchQuery === '' });
  }

  onFocus = () => {
    this.setState({ showPlacehoder: false, showFilterModal: true });
  }

  onChangeStrict = () => {
    this.props.applyFilter({ strict: !this.props.strict });
  }

  onSearchChange = (e, { value }) => {
    this.props.setSearchQuery(value)
    if (value !== '') this.fetchEventList({ q: value });
  }
  
  onPlaceholderClick = () => {
    this.inputRef.current && this.inputRef.current.focus();
  }

  closeModal = () => {
    this.setState({ showPlacehoder: true, showFilterModal: false })
  }

  onPlaceholderItemClick = (e, filter) => {
    e.stopPropagation();
    e.preventDefault();

    if (Array.isArray(filter)) {
      for (var i = 0; i < filter.length; i++) {
        this.onPlaceholderItemClick(e, filter[i]);
      }
    } else if (filter.isFilter) {
      this.props.setFilterOption(filter.key, [{ value: filter.value[0], type: filter.key }])
      this.props.addAttribute(filter);
    }
    else
      this.props.addEvent(filter);

    if (filter.value || filter.hasNoValue) {
      this.props.applyFilter();
    }
  }

  clearEvents = () => {
    this.props.clearEvents();
    this.props.setActiveFlow(null)
  }

  render() {
    const {
      events,
      loading,
      searchedEvents,
      appliedFilterKeys,
      appliedFilter,
      searchQuery,
      blink
    } = this.props;
    const { showFilterModal, showPlacehoder } = this.state;
    const hasFilters = appliedFilter.events.size > 0 || appliedFilter.filters.size > 0;

    return (
      <OutsideClickDetectingDiv className={ stl.wrapper } onClickOutside={ this.closeModal } >
        { showPlacehoder && !hasFilters &&
          <div
            className={ stl.randomElement }
            onClick={ this.onPlaceholderClick }
          >
            { !searchQuery && 
              <div className={ stl.placeholder }>Search for users, clicks, page visits, requests, errors and more</div>
              // <RandomPlaceholder onClick={ this.onPlaceholderItemClick } appliedFilterKeys={ appliedFilterKeys } />
            }
          </div>
        }
        <Input
          inputProps={ { "data-openreplay-label": "Search", "autocomplete": "off" } }
          className={stl.searchField}
          ref={ this.inputRef }
          onChange={ this.onSearchChange }
          onKeyUp={this.onKeyUp}
          value={searchQuery}
          icon="search"
          iconPosition="left"
          placeholder={ hasFilters ? 'Search sessions using any captured event (click, input, page, error...)' : ''}
          fluid
          onFocus={ this.onFocus }
          onBlur={ this.onBlur }
          id="search"
          autocomplete="off"
        />

        <FilterModal
          close={ this.closeModal }
          displayed={ showFilterModal }
          loading={ loading }
          searchedEvents={ searchedEvents }
          searchQuery={ searchQuery }
        />
        
        { hasFilters &&
          <div className={cn("bg-white rounded border-gray-light mt-2 relative", { 'blink-border' : blink })}>            
            { events.size > 0 &&
              <>
                <div className="py-1"><ListHeader title="Events" /></div>
                { events.map((event, i) => (
                  <EventEditor
                    index={ i }
                    key={ event._key }
                    event={ event }
                    onDNDMove={ this.props.moveEvent }
                  />
                )) }
              </>
            }
            <Attributes />
            <hr className="divider-light m-0 h-0"/>

            <div className="bg-white flex items-center py-2" style={{ borderBottomLeftRadius: '3px', borderBottomRightRadius: '3px'}}>
              <div className="mr-auto ml-2">
                <CustomFilters 
                  buttonComponent={ 
                  <div>
                    <IconButton icon="plus" label="ADD STEP" primaryText />
                    </div>
                  }
                  showFilters={ true }
                />
              </div>
              <div className="flex items-center">
                <div>
                  <IconButton plain label="CLEAR STEPS" onClick={ this.clearEvents } />
                </div>
                <ManageFilters />
              </div>              
            </div>            
          </div>
        }
      </OutsideClickDetectingDiv>
    );
  }
}
