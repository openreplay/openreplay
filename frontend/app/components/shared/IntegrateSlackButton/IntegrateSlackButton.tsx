import React from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function IntegrateSlackTeamsButton({ history }) {
  const { t } = useTranslation();
  const gotoPreferencesIntegrations = () => {
    history.push(clientRoute(CLIENT_TABS.INTEGRATIONS));
  };

  return (
    <div>
      <Button
        className="my-auto mt-2 mb-2 flex items-center gap-2"
        onClick={gotoPreferencesIntegrations}
        type="text"
      >
        <Icon name="integrations/slack" size={16} />
        <Icon name="integrations/teams" size={24} className="mr-2 ml-1" />

        <span>{t('Integrate Slack or MS Teams')}</span>
      </Button>
    </div>
  );
}

export default withRouter(IntegrateSlackTeamsButton);
