import { connect } from 'react-redux';
import { Loader, NoContent, Message, Icon, Button, LoadMoreButton } from 'UI';
import { applyFilter, addAttribute, addEvent } from 'Duck/filters';
import SessionItem from 'Shared/SessionItem';
import SessionListHeader from './SessionListHeader';
import { KEYS } from 'Types/filter/customFilter';
import styles from './sessionList.css';

const ALL = 'all';
const PER_PAGE = 10;

@connect(state => ({
  savedFilters: state.getIn([ 'filters', 'list' ]),
  loading: state.getIn([ 'sessions', 'loading' ]),
  activeTab: state.getIn([ 'sessions', 'activeTab' ]),
  allList: state.getIn([ 'sessions', 'list' ]),
  total: state.getIn([ 'sessions', 'total' ]),
  filters: state.getIn([ 'filters', 'appliedFilter', 'filters' ]),  
}), {
  applyFilter,
  addAttribute,
  addEvent
})
export default class SessionList extends React.PureComponent {
  state = {
    showPages: 1,
  }
  constructor(props) {
    super(props);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.loading && !this.props.loading) {
      this.setState({ showPages: 1 });
    }
  }

  addPage = () => this.setState({ showPages: this.state.showPages + 1 })

  onUserClick = (userId, userAnonymousId) => {
    if (userId) {
      this.props.addAttribute({ label: 'User Id', key: KEYS.USERID, type: KEYS.USERID, operator: 'is', value: userId })
    } else {
      this.props.addAttribute({ label: 'Anonymous ID', key: 'USERANONYMOUSID', type: "USERANONYMOUSID", operator: 'is', value: userAnonymousId  })
    }
    
    this.props.applyFilter()
  }

  getNoContentMessage = activeTab => {
    let str = "No recordings found";
    if (activeTab.type !== 'all') {
      str += ' with ' + activeTab.name;
      return str;
    }
    
    return str + '!';
  }

  renderActiveTabContent(list) {
    const {
      loading,
      filters,
      onMenuItemClick,
      allList,
      activeTab
    } = this.props;

    const hasUserFilter = filters.map(i => i.key).includes(KEYS.USERID);
    const { showPages } = this.state;
    const displayedCount = Math.min(showPages * PER_PAGE, list.size);

    return (
      <NoContent
        title={this.getNoContentMessage(activeTab)}
        subtext="Please try changing your search parameters."
        icon="exclamation-circle"
        show={ !loading && list.size === 0}
        subtext={
        <div>
          <div>Please try changing your search parameters.</div>
          {allList.size > 0 && (
            <div className="pt-2">
              However, we found other sessions based on your search parameters. 
              <div>
                <Button
                  plain
                  onClick={() => onMenuItemClick({ name: 'All', type: 'all' })}
                >See All</Button>
              </div>
            </div>
          )}
        </div>
        }
      >
        <Loader loading={ loading }>
          { list.take(displayedCount).map(session => (
            <SessionItem
              key={ session.sessionId }
              session={ session }
              hasUserFilter={hasUserFilter}
              onUserClick={this.onUserClick}
            />
          ))}
        </Loader>
        <LoadMoreButton
          className="mt-12 mb-12"
          displayedCount={displayedCount}
          totalCount={list.size}
          loading={loading}
          onClick={this.addPage}
          description={ displayedCount === list.size && 
            <div className="color-gray-medium text-sm text-center my-3">
              Haven't found the session in the above list? <br/>Try being a bit more specific by setting a specific time frame or simply use different filters
            </div>
          }
        />
      </NoContent>
    );
  }

  render() {
    const { activeTab, allList, total }  = this.props;
    var filteredList;

    if (activeTab.type !== ALL && activeTab.type !== 'bookmark') { // Watchdog sessions
      filteredList = allList.filter(session => activeTab.fits(session))
    } else {
      filteredList = allList
    }

    if (activeTab.type === 'bookmark') {
      filteredList = filteredList.filter(item => item.favorite)
    }
    const _total = activeTab.type === 'all' ? total : filteredList.size
    
    return (
      <div className="">
        <div className="flex justify-around">
        </div>
        <SessionListHeader activeTab={activeTab} count={_total}/>
        { this.renderActiveTabContent(filteredList) }
      </div>
    );
  }
}
