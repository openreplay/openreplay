import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Switch } from 'UI';
import { useTranslation } from 'react-i18next';

function MouseTrailSettings() {
  const { settingsStore } = useStore();
  const { sessionSettings } = settingsStore;
  const { mouseTrail } = sessionSettings;
  const { t } = useTranslation();

  const updateSettings = (checked: boolean) => {
    settingsStore.sessionSettings.updateKey('mouseTrail', !mouseTrail);
  };

  return (
    <div>
      <h3 className="text-lg">{t('Mouse Trail')}</h3>
      <div className="my-1">
        {t('See mouse trail to easily spot user activity.')}
      </div>
      <div className="mt-2">
        <Switch onChange={updateSettings} checked={mouseTrail} />
      </div>
    </div>
  );
}

export default observer(MouseTrailSettings);
