import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Switch } from 'UI';
import { useTranslation } from 'react-i18next';

function VirtualModeSettings() {
  const { settingsStore } = useStore();
  const { sessionSettings } = settingsStore;
  const { virtualMode } = sessionSettings;
  const { t } = useTranslation();

  const updateSettings = (checked: boolean) => {
    settingsStore.sessionSettings.updateKey('virtualMode', !virtualMode);
  };

  return (
    <div>
      <h3 className="text-lg">{t('Virtual Mode')}</h3>
      <div className="my-1">
        {t('Change this setting if you have issues with recordings containing Lightning Web Components (or similar custom HTML Element libraries).')}
      </div>
      <div className="mt-2">
        <Switch onChange={updateSettings} checked={virtualMode} />
      </div>
    </div>
  );
}

export default observer(VirtualModeSettings);
