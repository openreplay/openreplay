import React, { useEffect } from 'react'
import IssueItem from 'Components/Funnels/IssueItem'
import FunnelSessionList from 'Components/Funnels/FunnelSessionList'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'
import { fetchIssue, setNavRef, resetIssue } from 'Duck/funnels'
import { funnel as funnelRoute, withSiteId } from 'App/routes'
import { Loader } from 'UI'

function FunnelIssueDetails(props) {
  const { issue, issueId, funnelId, loading = false } = props;
  
  useEffect(() => {    
    props.fetchIssue(funnelId, issueId)    

    return () => {
      props.resetIssue();
    }
  }, [issueId])

  const onBack = () => {
    const { siteId, history } = props;
    history.push(withSiteId(funnelRoute(parseInt(funnelId)), siteId));
  }

  return (
    <div className="page-margin container-70" >
      <Loader loading={loading}>
        <IssueItem issue={issue} inDetails onBack={onBack} />
        <div className="my-6" />
        <FunnelSessionList funnelId={funnelId} issueId={issueId} inDetails />
      </Loader>
    </div>
  )
}

export default connect((state, props) => ({  
  loading: state.getIn(['funnels', 'fetchIssueRequest', 'loading']),
  issue: state.getIn(['funnels', 'issue']),  
  issueId: props.match.params.issueId,
  funnelId: props.match.params.funnelId,
  siteId: state.getIn([ 'site', 'siteId' ]),
}), { fetchIssue, setNavRef, resetIssue })(withRouter(FunnelIssueDetails))
