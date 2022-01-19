import { connect } from 'react-redux';
import { Input } from 'semantic-ui-react';
import { DNDContext } from 'Components/hocs/dnd';
import {
  addEvent, applyFilter, moveEvent, clearEvents, edit,
  addCustomFilter, addAttribute, setSearchQuery, setActiveFlow, setFilterOption
} from 'Duck/filters';
import { fetchList as fetchEventList } from 'Duck/events';
import { debounce } from 'App/utils';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import EventEditor from './EventEditor';
import ListHeader from '../ListHeader';
import FilterModal from '../CustomFilters/FilterModal';
import { IconButton, SegmentSelection } from 'UI';
import stl from './eventFilter.css';
import Attributes from '../Attributes/Attributes';
import RandomPlaceholder from './RandomPlaceholder';
import CustomFilters from '../CustomFilters';
import ManageFilters from '../ManageFilters';
import { blink as setBlink }  from 'Duck/funnels';
import cn from 'classnames';
import SaveFilterButton from 'Shared/SaveFilterButton';

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
  setBlink,
  edit,
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

  changeConditionTab = (e, { name, value }) => {
    this.props.edit({ [ 'condition' ]: value })
  };

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
        <FilterModal
          close={ this.closeModal }
          displayed={ showFilterModal }
          loading={ loading }
          searchedEvents={ searchedEvents }
          searchQuery={ searchQuery }
        />
        
        { hasFilters &&
            <div className={cn("bg-white rounded border-gray-light mt-2 relative", { 'blink-border' : blink })}>            
              <div className="absolute right-0 top-0 m-3 z-10 flex items-center">
                <div className="mr-2">Operator</div>
                <SegmentSelection
                  primary
                  name="condition"
                  extraSmall={true}
                  // className="my-3"
                  onSelect={ this.changeConditionTab }
                  value={{ value: appliedFilter.condition }}
                  list={ [
                    { name: 'AND', value: 'and' },
                    { name: 'OR', value: 'or' },
                    { name: 'THEN', value: 'then' },
                  ]}
                />
              </div>
            
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
              <SaveFilterButton />
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
