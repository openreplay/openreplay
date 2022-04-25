import React from 'react'
import { connect } from 'react-redux'
import { Loader, NoContent } from 'UI';
import SessionStack from 'Shared/SessionStack/SessionStack'
import FunnelListHeader from 'Components/Funnels/FunnelListHeader';

function SessionFlowList({ activeTab, savedFilters, loading }) {
  return (
    <div>      
      <FunnelListHeader activeTab={activeTab} count={0} />
      <NoContent
        title="No Flows Found!"
        subtext="Please try changing your search parameters."
        animatedIcon="no-results"
        show={ !loading && savedFilters.size === 0 }
      >
        <Loader loading={ loading }>
          {savedFilters.map(item => (
            <div className="mb-4" key={item.key}>
              <SessionStack flow={item} />
            </div>
          ))}
        </Loader>
      </NoContent>
    </div>
  )
}

export default connect(state => ({
  loading: state.getIn([ 'filters', 'fetchListRequest', 'loading' ]),
  activeTab: state.getIn([ 'sessions', 'activeTab' ]),
  savedFilters: state.getIn([ 'filters', 'list' ]),
}), {})(SessionFlowList)
