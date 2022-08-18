import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import { fetchFavoriteList as fetchFavoriteSessionList } from 'Duck/sessions';
import { applyFilter, clearEvents, addAttribute } from 'Duck/filters';
import { KEYS } from 'Types/filter/customFilter';
import SessionList from './SessionList';
import stl from './bugFinder.module.css';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { fetch as fetchFilterVariables } from 'Duck/sources';
import { fetchSources } from 'Duck/customField';
import { setActiveTab } from 'Duck/search';
import SessionsMenu from './SessionsMenu/SessionsMenu';
import NoSessionsMessage from 'Shared/NoSessionsMessage';
import SessionSearch from 'Shared/SessionSearch';
import MainSearchBar from 'Shared/MainSearchBar';
import { clearSearch, fetchSessions, addFilterByKeyAndValue } from 'Duck/search';
import { FilterKey } from 'Types/filter/filterType';

const weakEqual = (val1, val2) => {
    if (!!val1 === false && !!val2 === false) return true;
    if (!val1 !== !val2) return false;
    return `${val1}` === `${val2}`;
};

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
@connect(
    (state) => ({
        filter: state.getIn(['filters', 'appliedFilter']),
        variables: state.getIn(['customFields', 'list']),
        sources: state.getIn(['customFields', 'sources']),
        filterValues: state.get('filterValues'),
        favoriteList: state.getIn(['sessions', 'favoriteList']),
        currentProjectId: state.getIn(['site', 'siteId']),
        sites: state.getIn(['site', 'list']),
        watchdogs: state.getIn(['watchdogs', 'list']),
        activeFlow: state.getIn(['filters', 'activeFlow']),
        sessions: state.getIn(['sessions', 'list']),
    }),
    {
        fetchFavoriteSessionList,
        applyFilter,
        addAttribute,
        fetchFilterVariables,
        fetchSources,
        clearEvents,
        setActiveTab,
        clearSearch,
        fetchSessions,
        addFilterByKeyAndValue,
    }
)
@withPageTitle('Sessions - OpenReplay')
export default class BugFinder extends React.PureComponent {
    state = { showRehydratePanel: false };
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
        // if (props.sessions.size === 0) {
        //   props.fetchSessions();
        // }

        const queryFilter = this.props.query.all(allowedQueryKeys);
        if (queryFilter.hasOwnProperty('userId')) {
            props.addFilterByKeyAndValue(FilterKey.USERID, queryFilter.userId);
        } else {
            if (props.sessions.size === 0) {
                props.fetchSessions();
            }
        }
    }

    toggleRehydratePanel = () => {
        this.setState({ showRehydratePanel: !this.state.showRehydratePanel });
    };

    setActiveTab = (tab) => {
        this.props.setActiveTab(tab);
    };

    render() {
        const { showRehydratePanel } = this.state;

        return (
            <div className="page-margin container-90 flex relative">
                <div className="flex-1 flex">
                    <div className="side-menu">
                        <SessionsMenu onMenuItemClick={this.setActiveTab} toggleRehydratePanel={this.toggleRehydratePanel} />
                    </div>
                    <div className={cn('side-menu-margined', stl.searchWrapper)}>
                        <NoSessionsMessage />
                        <div className="mb-5">
                            <MainSearchBar />
                            <SessionSearch />
                        </div>
                        <SessionList onMenuItemClick={this.setActiveTab} />
                    </div>
                </div>
            </div>
        );
    }
}
