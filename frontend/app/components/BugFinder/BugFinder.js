import cn from 'classnames';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import {
  fetchFavoriteList as fetchFavoriteSessionList
} from 'Duck/sessions';
import { applyFilter, clearEvents, addAttribute } from 'Duck/filters';
import { fetchList as fetchFunnelsList } from 'Duck/funnels';
import { KEYS } from 'Types/filter/customFilter';
import SessionList from './SessionList';
import stl from './bugFinder.css';
import withLocationHandlers from "HOCs/withLocationHandlers";
import { fetch as fetchFilterVariables } from 'Duck/sources';
import { fetchSources } from 'Duck/customField';
import { RehydrateSlidePanel } from './WatchDogs/components';
import { setFunnelPage } from 'Duck/sessions';
import { setActiveTab } from 'Duck/search';
import SessionsMenu from './SessionsMenu/SessionsMenu';
import { LAST_7_DAYS } from 'Types/app/period';
import { resetFunnel } from 'Duck/funnels';
import { resetFunnelFilters } from 'Duck/funnelFilters'
import NoSessionsMessage from 'Shared/NoSessionsMessage';
// import TrackerUpdateMessage from 'Shared/TrackerUpdateMessage';
import SessionSearch from 'Shared/SessionSearch';
import MainSearchBar from 'Shared/MainSearchBar';
import { clearSearch, fetchSessions, addFilterByKeyAndValue } from 'Duck/search';
import { FilterCategory, FilterKey, IssueType } from 'Types/filter/filterType';

const weakEqual = (val1, val2) => {
  if (!!val1 === false && !!val2 === false) return true;
  if (!val1 !== !val2) return false;
  return `${ val1 }` === `${ val2 }`;
}

const allowedQueryKeys = [
  'userOs',
  'userId',
  'userBrowser',
  'userDevice',
  'userCountry',
  'startDate',
  'endDate',
  'minDuration',
  'maxDuration',
  'referrer',
  'sort',
  'order',
];

@withLocationHandlers()
@connect(state => ({
  filter: state.getIn([ 'filters', 'appliedFilter' ]),
  variables: state.getIn([ 'customFields', 'list' ]), 
  sources: state.getIn([ 'customFields', 'sources' ]),
  filterValues: state.get('filterValues'),
  favoriteList: state.getIn([ 'sessions', 'favoriteList' ]),
  currentProjectId: state.getIn([ 'site', 'siteId' ]),
  sites: state.getIn([ 'site', 'list' ]),
  watchdogs: state.getIn(['watchdogs', 'list']),
  activeFlow: state.getIn([ 'filters', 'activeFlow' ]),
  sessions: state.getIn([ 'sessions', 'list' ]),
}), {
  fetchFavoriteSessionList,
  applyFilter,
  addAttribute,
  fetchFilterVariables, 
  fetchSources,
  clearEvents,
  setActiveTab,
  fetchFunnelsList,
  resetFunnel,
  resetFunnelFilters,
  setFunnelPage,
  clearSearch,
  fetchSessions,
  addFilterByKeyAndValue,
})
@withPageTitle("Sessions - OpenReplay")
export default class BugFinder extends React.PureComponent {
  state = {showRehydratePanel: false}
  constructor(props) {
    super(props);

    // TODO should cache the response
    // props.fetchSources().then(() => {
    //   defaultFilters[6] = {
    //     category: 'Collaboration',
    //     type: 'CUSTOM',
    //     keys: this.props.sources.filter(({type}) => type === 'collaborationTool').map(({ label, key }) => ({ type: 'CUSTOM', source: key, label: label, key, icon: 'integrations/' + key, isFilter: false })).toJS()
    //   };
    //   defaultFilters[7] = {
    //     category: 'Logging Tools',
    //     type: 'ERROR',
    //     keys: this.props.sources.filter(({type}) => type === 'logTool').map(({ label, key }) => ({ type: 'ERROR', source: key, label: label, key, icon: 'integrations/' + key, isFilter: false })).toJS()
    //   };
    // });
    if (props.sessions.size === 0) {
      props.fetchSessions();
    }
    props.resetFunnel();
    props.resetFunnelFilters();
    props.fetchFunnelsList(LAST_7_DAYS)

    const queryFilter = this.props.query.all(allowedQueryKeys);
    if (queryFilter.hasOwnProperty('userId')) {
      // props.addAttribute({ label: 'User Id', key: KEYS.USERID, type: KEYS.USERID, operator: 'is', value: queryFilter.userId })
      props.addFilterByKeyAndValue(FilterKey.USERID, queryFilter.userId);
    }
  }

  componentDidMount() {
    this.props.setFunnelPage(false);
  }

  toggleRehydratePanel = () => {
    this.setState({ showRehydratePanel: !this.state.showRehydratePanel })
  }

  setActiveTab = tab => {
    this.props.setActiveTab(tab);
  }

  render() {
    const { showRehydratePanel } = this.state;

    return (
      <div className="page-margin container-90 flex relative">
        <div className="flex-1 flex">
          <div className="side-menu">
            <SessionsMenu
              onMenuItemClick={this.setActiveTab}
              toggleRehydratePanel={ this.toggleRehydratePanel }
            />
          </div>
          <div className={cn("side-menu-margined", stl.searchWrapper) }>
            {/* <TrackerUpdateMessage /> */}
            <NoSessionsMessage />
            <div className="mb-5">
              <MainSearchBar />
              <SessionSearch />
            </div>
            <SessionList onMenuItemClick={this.setActiveTab} />
          </div>
        </div>
        <RehydrateSlidePanel
          isModalDisplayed={ showRehydratePanel }
          onClose={ () => this.setState({ showRehydratePanel: false })}
        />
      </div>
    );
  }
}
