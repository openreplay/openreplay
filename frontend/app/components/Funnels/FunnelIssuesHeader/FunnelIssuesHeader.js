import React from 'react'
import { connect } from 'react-redux';

function FunnelIssuesHeader({ criticalIssuesCount, filters }) {  
  return (
    <div className="flex items-center">
      <div className="flex items-center mr-auto text-xl">
        <div className="font-medium mr-2">          
          Most significant issues
        </div>
        <div className="mr-2">identified in this funnel</div>        
      </div>      
    </div>
  )
}

export default connect(state => ({
  filters: state.getIn(['funnels', 'issueFilters'])
}))(FunnelIssuesHeader)
