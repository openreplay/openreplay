import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';
import { Button } from 'antd';

import TeamsChannelList from './TeamsChannelList';
import TeamsAddForm from './TeamsAddForm';
import { useTranslation } from 'react-i18next';

function MSTeams() {
  const { t } = useTranslation();
  const { integrationsStore } = useStore();
  const fetchList = integrationsStore.msteams.fetchIntegrations;
  const { init } = integrationsStore.msteams;
  const [active, setActive] = React.useState(false);

  const onEdit = () => {
    setActive(true);
  };

  const onNew = () => {
    setActive(true);
    init({});
  };

  useEffect(() => {
    void fetchList();
  }, []);

  return (
    <div
      className="bg-white h-screen overflow-y-auto flex items-start"
      style={{ width: active ? '700px' : '350px' }}
    >
      {active && (
        <div className="border-r h-full" style={{ width: '350px' }}>
          <TeamsAddForm onClose={() => setActive(false)} />
        </div>
      )}
      <div className="shrink-0" style={{ width: '350px' }}>
        <div className="flex items-center p-5">
          <h3 className="text-2xl mr-3">{t('Microsoft Teams')}</h3>
          <Button
            shape="circle"
            icon={<Icon name="plus" size={24} />}
            type="text"
            onClick={onNew}
          />
        </div>
        <TeamsChannelList onEdit={onEdit} />
      </div>
    </div>
  );
}

MSTeams.displayName = 'MSTeams';

export default observer(MSTeams);
