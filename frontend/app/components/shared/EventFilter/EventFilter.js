import { connect } from 'react-redux';
import { DNDContext } from 'Components/hocs/dnd';
import {
  addEvent, applyFilter, moveEvent, clearEvents,
  addCustomFilter, addAttribute, setSearchQuery, setActiveFlow, setFilterOption
} from 'Duck/funnelFilters';
import { updateFunnelFilters, refresh as refreshFunnel  } from 'Duck/funnels';
import { fetchList as fetchEventList } from 'Duck/events';
import { debounce } from 'App/utils';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import EventEditor from './EventEditor';
import ListHeader from '../../BugFinder/ListHeader';
import { IconButton } from 'UI';
import stl from './eventFilter.css';
import Attributes from './Attributes';
import CustomFilters from './CustomFilters';

@connect(state => ({
  funnel: state.getIn([ 'funnels', 'instance' ]),
  events: state.getIn([ 'funnelFilters', 'appliedFilter', 'events' ]),
  filters: state.getIn([ 'funnelFilters', 'appliedFilter', 'filters' ]),
  appliedFilter: state.getIn([ 'funnelFilters', 'appliedFilter' ]),
  searchQuery: state.getIn([ 'funnelFilters', 'searchQuery' ]),
  appliedFilterKeys: state.getIn([ 'funnelFilters', 'appliedFilter', 'filters' ])
    .map(({type}) => type).toJS(),
  searchedEvents: state.getIn([ 'events', 'list' ]),
  loading: state.getIn([ 'funnels', 'updateRequest', 'loading' ])
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
  updateFunnelFilters,
  refreshFunnel
})
@DNDContext
export default class EventFilter extends React.PureComponent {
  state = { search: '', showFilterModal: false, showPlacehoder: true, showSaveModal: false }  
  fetchEventList = debounce(this.props.fetchEventList, 500)
  inputRef = React.createRef()

  onBlur = () => {
    const { searchQuery } = this.props;
    this.setState({ showPlacehoder: searchQuery === '' });
  }

  onFocus = () => {
    this.setState({ showPlacehoder: false, showFilterModal: true });
  }

  onSearchChange = (e, { value }) => {
    this.props.setSearchQuery(value)
    if (value !== '') this.fetchEventList({ q: value });
  }

  closeModal = () => {
    this.setState({ showPlacehoder: true, showFilterModal: false })
  }

  clearEvents = () => {
    this.props.clearEvents();
    this.props.setActiveFlow(null)
  }

  saveFunnel = () => {
    const { funnel, filters, events } = this.props;    
    const _filters = { ...funnel.toData().filter };
    this.props.updateFunnelFilters(funnel.funnelId, { ..._filters, filters: filters.toJS(), events: events.toJS() }).then(function() {
      this.props.refreshFunnel(funnel.funnelId);
    }.bind(this))
  }

  render() {
    const {
      events,      
      loading,      
      onHide
    } = this.props;    

    return (
      <OutsideClickDetectingDiv className={ stl.wrapper } onClickOutside={ this.closeModal } >        
        <div className="bg-white rounded border-gray-light mt-2">
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
                <IconButton plain label="HIDE" onClick={ onHide } />
              </div>                                
              <IconButton
                loading={loading}
                primaryText
                className="mr-2"
                label="UPDATE FUNNEL"
                onClick={this.saveFunnel}
              />                
            </div>
          </div>
        </div>        
      </OutsideClickDetectingDiv>
    );
  }
}
