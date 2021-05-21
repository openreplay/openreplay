import React from 'react'
import { connect } from 'react-redux'
import { IconButton } from 'UI'
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';

function IntegrateSlackButton({ history, tenantId }) {
  const gotoPreferencesIntegrations = () => {
    history.push(clientRoute(CLIENT_TABS.INTEGRATIONS));
  }

  return (
    <div>
      <IconButton
        className="my-auto mt-2 mb-2"
        icon="integrations/slack"
        label="Integrate Slack"
        onClick={gotoPreferencesIntegrations}
      />
    </div>
  )
}

export default withRouter(connect(state => ({
  tenantId: state.getIn([ 'user', 'client', 'tenantId' ]),
}))(IntegrateSlackButton))
