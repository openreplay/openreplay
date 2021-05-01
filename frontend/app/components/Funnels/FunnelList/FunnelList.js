import React from 'react'
import FunnelItem from 'Components/Funnels/FunnelItem'
import FunnelListHeader from '../FunnelListHeader'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'
import { funnel as funnelRoute, withSiteId } from 'App/routes'

function FunnelList(props) {
  const { list = []} = props;

  const onFlowClick = ({ funnelId }) => {
      const { siteId, history } = props;
      history.push(withSiteId(funnelRoute(funnelId), siteId));
  }

  return (
    <div>
      <FunnelListHeader sessionsCount={300} />
      <div className="my-3" />
      { list.map(funnel => (
        <div className="mb-3">
          <FunnelItem funnel={funnel} onClick={() => onFlowClick(funnel)} />
        </div>
      ))}
    </div>
  )
}

export default connect(state => ({
  list: state.getIn(['funnels', 'list']),
  siteId: state.getIn([ 'user', 'siteId' ]),
}))(withRouter(FunnelList))
