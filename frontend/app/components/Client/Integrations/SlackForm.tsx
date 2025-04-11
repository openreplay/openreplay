import React, { useEffect } from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import SlackAddForm from './SlackAddForm';
import SlackChannelList from './SlackChannelList/SlackChannelList';
import { useTranslation } from 'react-i18next';

function SlackForm() {
  const { t } = useTranslation();
  const { integrationsStore } = useStore();
  const { init } = integrationsStore.slack;
  const fetchList = integrationsStore.slack.fetchIntegrations;
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
          <SlackAddForm onClose={() => setActive(false)} />
        </div>
      )}
      <div className="shrink-0" style={{ width: '350px' }}>
        <div className="flex items-center p-5">
          <h3 className="text-2xl mr-3">{t('Slack')}</h3>
          <Button
            shape="circle"
            type="text"
            icon={<Icon name="plus" size={24} />}
            onClick={onNew}
          />
        </div>
        <SlackChannelList onEdit={onEdit} />
      </div>
    </div>
  );
}

SlackForm.displayName = 'SlackForm';

export default observer(SlackForm);
