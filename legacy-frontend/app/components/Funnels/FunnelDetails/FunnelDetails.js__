import React, { useState, useEffect } from 'react'
import { Tabs, Loader } from 'UI'
import FunnelHeader from 'Components/Funnels/FunnelHeader'
import FunnelGraph from 'Components/Funnels/FunnelGraph'
import FunnelSessionList from 'Components/Funnels/FunnelSessionList'
import FunnelOverview from 'Components/Funnels/FunnelOverview'
import FunnelIssues from 'Components/Funnels/FunnelIssues'
import { connect } from 'react-redux';
import { 
  fetch, fetchInsights, fetchList, fetchFiltered, fetchIssuesFiltered, fetchSessionsFiltered, fetchIssueTypes, resetFunnel, refresh
} from 'Duck/funnels';
import { applyFilter, setFilterOptions, resetFunnelFilters, setInitialFilters } from 'Duck/funnelFilters';
import { withRouter } from 'react-router';
import { sessions as sessionsRoute, funnel as funnelRoute, withSiteId } from 'App/routes';
import FunnelSearch from 'Shared/FunnelSearch';
import cn from 'classnames';
import IssuesEmptyMessage from 'Components/Funnels/IssuesEmptyMessage'

const TAB_ISSUES = 'ANALYSIS';
const TAB_SESSIONS = 'SESSIONS';

const TABS = [ TAB_ISSUES, TAB_SESSIONS ].map(tab => ({ 
  text: tab,
  disabled: false,
  key: tab,
}));

const FunnelDetails = (props) => {
  const { insights, funnels, funnel, funnelId, loading, liveFilters, issuesLoading, sessionsLoading, refresh } = props;
  const [activeTab, setActiveTab] = useState(TAB_ISSUES)
  const [showFilters, setShowFilters] = useState(false)
  const [mounted, setMounted] = useState(false);
  const onTabClick = activeTab => setActiveTab(activeTab)

  useEffect(() => {    
    if (funnels.size === 0) {
      props.fetchList();      
    }
    props.fetchIssueTypes()

    props.fetch(funnelId).then(() => {      
      setMounted(true);      
    }).then(() => {
      props.refresh(funnelId);
    })

  }, []);  

  // useEffect(() => {        
  //   if (funnel && funnel.filter && liveFilters.events.size === 0) {      
  //     props.setInitialFilters();      
  //   }
  // }, [funnel])
  
  const onBack = () => {
    props.history.push(sessionsRoute());
  }

  const redirect = funnelId => {
    const { siteId, history } = props;
    props.resetFunnel();
    props.resetFunnelFilters();

    history.push(withSiteId(funnelRoute(parseInt(funnelId)), siteId));
  }

  const renderActiveTab = (tab, hasNoStages) => {    
    switch(tab) {
      case TAB_ISSUES:
        return !hasNoStages && <FunnelIssues funnelId={funnelId} />
      case TAB_SESSIONS:
        return <FunnelSessionList funnelId={funnelId} />
    }
  }

  const hasNoStages = !loading && insights.stages.length <= 1;
  const showEmptyMessage = hasNoStages && activeTab === TAB_ISSUES && !loading;

  return (
    <div className="page-margin container-70">
      <FunnelHeader
        funnel={funnel}
        insights={insights}
        redirect={redirect}      
        funnels={funnels}
        onBack={onBack}
        funnelId={parseInt(funnelId)}
        toggleFilters={() => setShowFilters(!showFilters)}
        showFilters={showFilters}
      />
      <div className="my-3" />
      {showFilters && (
        <FunnelSearch />
      )
      }
      <div className="my-3" />  
      <Tabs 
        tabs={ TABS }
        active={ activeTab }
        onClick={ onTabClick }        
      />
      <div className="my-8" />      
        <Loader loading={loading}>
          <IssuesEmptyMessage onAddEvent={() => setShowFilters(true)} show={showEmptyMessage}>
            <div>
              <div className={cn("flex items-start", { 'hidden' : activeTab === TAB_SESSIONS || hasNoStages })}>
                <div className="flex-1">
                  <FunnelGraph data={insights.stages} funnelId={funnelId} />
                </div>
                <div style={{ width: '35%'}} className="px-14">
                  <FunnelOverview funnel={insights} />
                </div>
              </div>
              <div className="my-8" />
              <Loader loading={issuesLoading || sessionsLoading}>
                { renderActiveTab(activeTab, hasNoStages) } 
              </Loader>              
            </div>
          </IssuesEmptyMessage>
        </Loader>                          
        
    </div>
  )
}

export default connect((state, props) => {
  const insightsLoading = state.getIn(['funnels', 'fetchInsights', 'loading']);
  const issuesLoading = state.getIn(['funnels', 'fetchIssuesRequest', 'loading']);
  const funnelLoading = state.getIn(['funnels', 'fetchRequest', 'loading']);
  const sessionsLoading = state.getIn(['funnels', 'fetchSessionsRequest', 'loading']);
  return {
    funnels: state.getIn(['funnels', 'list']),
    funnel: state.getIn(['funnels', 'instance']),
    insights: state.getIn(['funnels', 'insights']),    
    loading: funnelLoading || (insightsLoading && (issuesLoading || sessionsLoading)),
    issuesLoading,
    sessionsLoading,
    funnelId: props.match.params.funnelId,
    activeStages: state.getIn(['funnels', 'activeStages']),
    funnelFilters: state.getIn(['funnels', 'funnelFilters']),
    siteId: state.getIn([ 'site', 'siteId' ]),    
    liveFilters: state.getIn(['funnelFilters', 'appliedFilter']),
  }
}, { 
  fetch,
  fetchInsights,
  fetchFiltered,
  fetchIssuesFiltered,
  fetchList,
  applyFilter,  
  setFilterOptions,
  fetchIssuesFiltered,
  fetchSessionsFiltered,
  fetchIssueTypes,
  resetFunnel,
  resetFunnelFilters,
  setInitialFilters,
  refresh,
})(withRouter((FunnelDetails)))
