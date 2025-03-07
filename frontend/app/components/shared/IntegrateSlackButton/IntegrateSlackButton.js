import React from 'react'
import { Icon } from 'UI'
import { Button } from 'antd'
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { useNavigate } from "react-router";

function IntegrateSlackTeamsButton() {
  const navigate = useNavigate();
  const gotoPreferencesIntegrations = () => {
    navigate(clientRoute(CLIENT_TABS.INTEGRATIONS));
  }

  return (
    <div>
      <Button
        className="my-auto mt-2 mb-2 flex items-center gap-2"
        onClick={gotoPreferencesIntegrations}
        type="text"
      >
        <Icon name="integrations/slack" size={16} />
        <Icon name="integrations/teams" size={24} className="mr-2 ml-1" />

        <span>Integrate Slack or MS Teams</span>
      </Button>
    </div>
  )
}

export default IntegrateSlackTeamsButton
