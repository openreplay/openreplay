import { connect } from 'react-redux';
import { Loader, NoContent, Button, LoadMoreButton } from 'UI';
import { applyFilter, addAttribute, addEvent } from 'Duck/filters';
import { fetchSessions, addFilterByKeyAndValue } from 'Duck/search';
import SessionItem from 'Shared/SessionItem';
import SessionListHeader from './SessionListHeader';
import { FilterKey } from 'Types/filter/filterType';

const ALL = 'all';
const PER_PAGE = 10;
const AUTOREFRESH_INTERVAL = 3 * 60 * 1000;
var timeoutId;

@connect(state => ({
  shouldAutorefresh: state.getIn([ 'filters', 'appliedFilter', 'events' ]).size === 0,
  savedFilters: state.getIn([ 'filters', 'list' ]),
  loading: state.getIn([ 'sessions', 'loading' ]),
  activeTab: state.getIn([ 'sessions', 'activeTab' ]),
  allList: state.getIn([ 'sessions', 'list' ]),
  total: state.getIn([ 'sessions', 'total' ]),
  filters: state.getIn([ 'search', 'instance', 'filters' ]),
  metaList: state.getIn(['customFields', 'list']).map(i => i.key),
}), {
  applyFilter,
  addAttribute,
  addEvent,
  fetchSessions,
  addFilterByKeyAndValue,
})
export default class SessionList extends React.PureComponent {
  state = {
    showPages: 1,
  }
  constructor(props) {
    super(props);
    this.timeout();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.loading && !this.props.loading) {
      this.setState({ showPages: 1 });
    }
  }

  addPage = () => this.setState({ showPages: this.state.showPages + 1 })

  onUserClick = (userId, userAnonymousId) => {
    if (userId) {
      this.props.addFilterByKeyAndValue(FilterKey.USERID, userId);
    } else {
      this.props.addFilterByKeyAndValue(FilterKey.USERID, '', 'isUndefined');
    }
  }

  timeout = () => {
    timeoutId = setTimeout(function () {
      if (this.props.shouldAutorefresh) {
        // this.props.applyFilter();
        this.props.fetchSessions();
      }
      this.timeout();
    }.bind(this), AUTOREFRESH_INTERVAL);
  }

  getNoContentMessage = activeTab => {
    let str = "No recordings found";
    if (activeTab.type !== 'all') {
      str += ' with ' + activeTab.name;
      return str;
    }
    
    return str + '!';
  }

  componentWillUnmount() {
    clearTimeout(timeoutId)
  }

  renderActiveTabContent(list) {
    const {
      loading,
      filters,
      onMenuItemClick,
      allList,
      activeTab,
      metaList,
    } = this.props;
    const _filterKeys = filters.map(i => i.key);
    const hasUserFilter = _filterKeys.includes(FilterKey.USERID) || _filterKeys.includes(FilterKey.USERANONYMOUSID);
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
              metaList={metaList}
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

    if (activeTab.type !== ALL && activeTab.type !== 'bookmark' && activeTab.type !== 'live') { // Watchdog sessions
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
        <SessionListHeader activeTab={activeTab} count={_total}/>
        { this.renderActiveTabContent(filteredList) }
      </div>
    );
  }
}
