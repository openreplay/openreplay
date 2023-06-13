import React,  { useState } from 'react'
import { connect } from 'react-redux'
import { fetchIssues, fetchIssuesFiltered } from 'Duck/funnels'
import { LoadMoreButton, NoContent } from 'UI'
import FunnelIssuesHeader from '../FunnelIssuesHeader'
import IssueItem from '../IssueItem';
import { funnelIssue as funnelIssueRoute, withSiteId } from 'App/routes'
import { withRouter } from 'react-router'
import IssueFilter from '../IssueFilter';
import SortDropdown from './SortDropdown';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

const PER_PAGE = 10;

function FunnelIssues(props) {
  const {
    funnel, list, loading = false,
    criticalIssuesCount, issueFilters, sort
  } = props;

  const [showPages, setShowPages] = useState(1)

  const addPage = () => setShowPages(showPages + 1);
  
  const onClick = ({ issueId }) => {
    const { siteId, history } = props;    
    history.push(withSiteId(funnelIssueRoute(funnel.funnelId, issueId), siteId));
  }

  let filteredList = issueFilters.size > 0 ? list.filter(item => issueFilters.includes(item.type)) : list;
  filteredList = sort.sort ? filteredList.sortBy(i => i[sort.sort]) : filteredList;
  filteredList = sort.order === 'desc' ? filteredList.reverse() : filteredList;
  const displayedCount = Math.min(showPages * PER_PAGE, filteredList.size);

  return (
    <div>
      <FunnelIssuesHeader criticalIssuesCount={criticalIssuesCount} />
      <div className="my-5 flex items-start justify-between">
        <IssueFilter />
        <div className="flex items-center ml-6 flex-shrink-0">
          <span className="mr-2 color-gray-medium">Sort By</span>
          <SortDropdown />
        </div>
      </div>      
      <NoContent
        title={
          <div className="flex flex-col items-center justify-center">
              <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
              <div className="mt-4">No Issues Found!</div>
            </div>
        }
        subtext="Please try changing your search parameters."
        // animatedIcon="no-results"
        show={ !loading && filteredList.size === 0}
      >        
        { filteredList.take(displayedCount).map(issue => (
          <div className="mb-4">
            <IssueItem
              key={ issue.issueId }
              issue={ issue }
              onClick={() => onClick(issue)}       
            />
          </div>
        ))}

        <LoadMoreButton
          className="mt-12 mb-12"
          displayedCount={displayedCount}
          totalCount={filteredList.size}
          loading={loading}
          onClick={addPage}
        />
      </NoContent>
    </div>
  )
}

export default connect(state => ({  
  list: state.getIn(['funnels', 'issues']),
  criticalIssuesCount: state.getIn(['funnels', 'criticalIssuesCount']),
  loading: state.getIn(['funnels', 'fetchIssuesRequest', 'loading']),
  siteId: state.getIn([ 'site', 'siteId' ]),
  funnel: state.getIn(['funnels', 'instance']),
  activeStages: state.getIn(['funnels', 'activeStages']),
  funnelFilters: state.getIn(['funnels', 'funnelFilters']),
  liveFilters: state.getIn(['funnelFilters', 'appliedFilter']),
  issueFilters: state.getIn(['funnels', 'issueFilters', 'filters']),
  sort: state.getIn(['funnels', 'issueFilters', 'sort']),
}), { fetchIssues, fetchIssuesFiltered })(withRouter(FunnelIssues))
