import React from 'react';
import { connect } from 'react-redux';
import { Loader, NoContent, Pagination } from 'UI';
import { applyFilter, addAttribute, addEvent } from 'Duck/filters';
import { fetchSessions, addFilterByKeyAndValue, updateCurrentPage, setScrollPosition } from 'Duck/search';
import SessionItem from 'Shared/SessionItem';
import SessionListHeader from './SessionListHeader';
import { FilterKey } from 'Types/filter/filterType';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

// const ALL = 'all';
const PER_PAGE = 10;
const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;
var timeoutId;

@connect(state => ({
  shouldAutorefresh: state.getIn([ 'filters', 'appliedFilter', 'events' ]).size === 0,
  savedFilters: state.getIn([ 'filters', 'list' ]),
  loading: state.getIn([ 'sessions', 'loading' ]),
  activeTab: state.getIn([ 'search', 'activeTab' ]),
  allList: state.getIn([ 'sessions', 'list' ]),
  total: state.getIn([ 'sessions', 'total' ]),
  filters: state.getIn([ 'search', 'instance', 'filters' ]),
  metaList: state.getIn(['customFields', 'list']).map(i => i.key),
  currentPage: state.getIn([ 'search', 'currentPage' ]),
  scrollY: state.getIn([ 'search', 'scrollY' ]),
  lastPlayedSessionId: state.getIn([ 'sessions', 'lastPlayedSessionId' ]),
}), {
  applyFilter,
  addAttribute,
  addEvent,
  fetchSessions,
  addFilterByKeyAndValue,
  updateCurrentPage,
  setScrollPosition,
})
export default class SessionList extends React.PureComponent {

  constructor(props) {
    super(props);
    this.timeout();
  }

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
    this.props.setScrollPosition(window.scrollY)
    clearTimeout(timeoutId)
  }

  componentDidMount() {
    const { scrollY } = this.props;
    window.scrollTo(0, scrollY);
  }

  renderActiveTabContent(list) {
    const {
      loading,
      filters,
      activeTab,
      metaList,
      currentPage,
      total,
      lastPlayedSessionId,
    } = this.props;
    const _filterKeys = filters.map(i => i.key);
    const hasUserFilter = _filterKeys.includes(FilterKey.USERID) || _filterKeys.includes(FilterKey.USERANONYMOUSID);

    return (
      <div className="bg-white p-3 rounded border">
        <NoContent
          title={<div className="flex items-center justify-center flex-col">
            <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
            {this.getNoContentMessage(activeTab)}
          </div>}
          // subtext="Please try changing your search parameters."
          // animatedIcon="no-results"
          show={ !loading && list.size === 0}
          subtext={
            <div>
              <div>Please try changing your search parameters.</div>
            </div>
          }
        >
          
            <Loader loading={ loading }>
              { list.map(session => (
                <React.Fragment key={ session.sessionId }>
                <SessionItem
                  session={ session }
                  hasUserFilter={hasUserFilter}
                  onUserClick={this.onUserClick}
                  metaList={metaList}
                  lastPlayedSessionId={lastPlayedSessionId}
                />
                <div className="border-b" />
                </React.Fragment>
              ))}
            </Loader>
            <div className="w-full flex items-center justify-center py-6">
              <Pagination
                page={currentPage}
                totalPages={Math.ceil(total / PER_PAGE)}
                onPageChange={(page) => this.props.updateCurrentPage(page)}
                limit={PER_PAGE}
                debounceRequest={1000}
              />
            </div>
          </NoContent>
        </div>
    );
  }

  render() {
    const { activeTab, allList, total }  = this.props;
    
    return (
      <div className="">
        <SessionListHeader activeTab={activeTab} count={total}/>
        { this.renderActiveTabContent(allList) }
      </div>
    );
  }
}
