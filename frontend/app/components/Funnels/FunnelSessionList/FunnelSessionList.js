import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import SessionItem from 'Shared/SessionItem'
import { fetchSessions, fetchSessionsFiltered } from 'Duck/funnels'
import { setFunnelPage } from 'Duck/sessions'
import { LoadMoreButton, NoContent, Loader } from 'UI'
import FunnelSessionsHeader from '../FunnelSessionsHeader'

const PER_PAGE = 10;

function FunnelSessionList(props) {
  const { funnelId, issueId, list, sessionsTotal, sessionsSort, inDetails = false } = props;

  const [showPages, setShowPages] = useState(1)
  const displayedCount = Math.min(showPages * PER_PAGE, list.size);

  const addPage = () => setShowPages(showPages + 1);

  useEffect(() => {
    props.setFunnelPage({
      funnelId,
      issueId
    })
  }, [])

  return (
    <div>
      <FunnelSessionsHeader sessionsCount={inDetails ? sessionsTotal : list.size} inDetails={inDetails} />
      <div className="mb-4" />
      <NoContent
        title="No recordings found!"
        subtext="Please try changing your search parameters."
        icon="exclamation-circle"
        show={ list.size === 0}
      >
        { list.take(displayedCount).map(session => (
          <SessionItem
            key={ session.sessionId }
            session={ session }            
          />
        ))}

        <LoadMoreButton
          className="mt-12 mb-12"
          displayedCount={displayedCount}
          totalCount={list.size}
          onClick={addPage}
        />
      </NoContent>
    </div>
  )
}

export default connect(state => ({  
  list: state.getIn(['funnels', 'sessions']),
  sessionsTotal: state.getIn(['funnels', 'sessionsTotal']),  
  funnel: state.getIn(['funnels', 'instance']),
  activeStages: state.getIn(['funnels', 'activeStages']).toJS(),
  liveFilters: state.getIn(['funnelFilters', 'appliedFilter']),
  funnelFilters: state.getIn(['funnels', 'funnelFilters']),
  sessionsSort: state.getIn(['funnels', 'sessionsSort']),
}), { fetchSessions, fetchSessionsFiltered, setFunnelPage })(FunnelSessionList)
