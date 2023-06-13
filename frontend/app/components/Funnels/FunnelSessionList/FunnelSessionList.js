import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import SessionItem from 'Shared/SessionItem'
import { fetchSessions, fetchSessionsFiltered } from 'Duck/funnels'
import { setFunnelPage } from 'Duck/sessions'
import { LoadMoreButton, NoContent } from 'UI'
import FunnelSessionsHeader from '../FunnelSessionsHeader'
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

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
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
            <div className="mt-4">No recordings found!</div>
          </div>
        }
        subtext="Please try changing your search parameters."
        // animatedIcon="no-results"
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
