import cn from 'classnames';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import {
  fetchFavoriteList as fetchFavoriteSessionList
} from 'Duck/sessions';
import { countries } from 'App/constants';
import { applyFilter, clearEvents, addAttribute } from 'Duck/filters';
import { fetchList as fetchFunnelsList } from 'Duck/funnels';
import { defaultFilters, preloadedFilters } from 'Types/filter';
import { KEYS } from 'Types/filter/customFilter';
import EventFilter from './EventFilter';
import SessionList from './SessionList';
import FunnelList from 'Components/Funnels/FunnelList';
import stl from './bugFinder.css';
import { fetchList as fetchSiteList } from 'Duck/site';
import withLocationHandlers from "HOCs/withLocationHandlers";
import { fetch as fetchFilterVariables } from 'Duck/sources';
import { fetchList as fetchIntegrationVariables, fetchSources } from 'Duck/customField';
import { RehydrateSlidePanel } from './WatchDogs/components';
import { setActiveTab, setFunnelPage } from 'Duck/sessions';
import SessionsMenu from './SessionsMenu/SessionsMenu';
import SessionFlowList from './SessionFlowList/SessionFlowList';
import { LAST_7_DAYS } from 'Types/app/period';
import { resetFunnel } from 'Duck/funnels';
import { resetFunnelFilters } from 'Duck/funnelFilters'
import NoSessionsMessage from '../shared/NoSessionsMessage';
import TrackerUpdateMessage from '../shared/TrackerUpdateMessage';
import LiveSessionList from './LiveSessionList'

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
  showLive: state.getIn([ 'user', 'account', 'appearance', 'sessionsLive' ]),
  variables: state.getIn([ 'customFields', 'list' ]), 
  sources: state.getIn([ 'customFields', 'sources' ]),
  filterValues: state.get('filterValues'),
  activeTab: state.getIn([ 'sessions', 'activeTab' ]),
  favoriteList: state.getIn([ 'sessions', 'favoriteList' ]),
  currentProjectId: state.getIn([ 'user', 'siteId' ]),
  sites: state.getIn([ 'site', 'list' ]),
  watchdogs: state.getIn(['watchdogs', 'list']),
  activeFlow: state.getIn([ 'filters', 'activeFlow' ]),
}), {
  fetchFavoriteSessionList,
  applyFilter,
  addAttribute,
  fetchFilterVariables,
  fetchIntegrationVariables,
  fetchSources,
  clearEvents,
  setActiveTab,
  fetchSiteList,
  fetchFunnelsList,
  resetFunnel,
  resetFunnelFilters,
  setFunnelPage
})
@withPageTitle("Sessions - OpenReplay")
export default class BugFinder extends React.PureComponent {
  state = {showRehydratePanel: false}
  constructor(props) {
    super(props);
    // props.fetchFavoriteSessionList();    
    // TODO should cache the response
    props.fetchSources().then(() => {
      defaultFilters[6] = {
        category: 'Collaboration',
        type: 'CUSTOM',
        keys: this.props.sources.filter(({type}) => type === 'collaborationTool').map(({ label, key }) => ({ type: 'CUSTOM', source: key, label: label, key, icon: 'integrations/' + key, isFilter: false })).toJS()
      };
      defaultFilters[7] = {
        category: 'Logging Tools',
        type: 'ERROR',
        keys: this.props.sources.filter(({type}) => type === 'logTool').map(({ label, key }) => ({ type: 'ERROR', source: key, label: label, key, icon: 'integrations/' + key, isFilter: false })).toJS()
      };
    });
    // TODO should cache the response
    props.fetchIntegrationVariables().then(() => {
      defaultFilters[5] = {
        category: 'Metadata',
        type: 'custom',
        keys: this.props.variables.map(({ key }) => ({ type: 'METADATA', key, label: key, icon: 'filters/metadata', isFilter: true })).toJS()
      };
    });    

    props.resetFunnel();
    props.resetFunnelFilters();
    props.fetchFunnelsList(LAST_7_DAYS)

    const queryFilter = this.props.query.all(allowedQueryKeys);
    if (queryFilter.hasOwnProperty('userId')) {
      props.addAttribute({ label: 'User Id', key: KEYS.USERID, type: KEYS.USERID, operator: 'is', value: queryFilter.userId })
    }
  }

  componentDidMount() {
    this.props.setFunnelPage(false);
  }

  toggleRehydratePanel = () => {
    this.setState({ showRehydratePanel: !this.state.showRehydratePanel })
  }

  fetchPreloadedFilters = () => {
    this.props.fetchFilterVariables('filterValues').then(function() {
      const { filterValues } = this.props;
      const keys = [
        {key: KEYS.USER_OS, label: 'OS'},
        {key: KEYS.USER_BROWSER, label: 'Browser'},
        {key: KEYS.USER_DEVICE, label: 'Device'},
        {key: KEYS.REFERRER, label: 'Referrer'},
        {key: KEYS.USER_COUNTRY, label: 'Country'},        
      ]
      if (filterValues && filterValues.size != 0) {
        keys.forEach(({key, label}) => {
          const _keyFilters = filterValues.get(key)
          if (key === KEYS.USER_COUNTRY) {
            preloadedFilters.push(_keyFilters.map(item => ({label, type: key, key, value: item, actualValue: countries[item], isFilter: true})));
          } else {
            preloadedFilters.push(_keyFilters.map(item => ({label, type: key, key, value: item, isFilter: true})));
          }
        })
      }
    }.bind(this));
  }

  setActiveTab = tab => {
    this.props.setActiveTab(tab);
  }

  render() {
    const { activeFlow, activeTab } = this.props;    
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
            <TrackerUpdateMessage />
            <NoSessionsMessage />
            <div 
              data-hidden={ activeTab === 'live' || activeTab === 'favorite' }
              className="mb-5"
            >
              <EventFilter />
            </div>            
            { activeFlow && activeFlow.type === 'flows' && <FunnelList /> }
            { activeTab.type !== 'live' && <SessionList onMenuItemClick={this.setActiveTab} /> }
            { activeTab.type === 'live' && <LiveSessionList /> }
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
