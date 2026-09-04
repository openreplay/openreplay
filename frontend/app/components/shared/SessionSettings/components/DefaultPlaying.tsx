import { Switch } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';

function DefaultPlaying() {
  const { settingsStore } = useStore();
  const sessionSettings = settingsStore.sessionSettings;
  const { t } = useTranslation();

  const toggleSkipToIssue = () => {
    sessionSettings.updateKey('skipToIssue', !sessionSettings.skipToIssue);
    toast.success(t('Default playing option saved successfully'));
  };

  return (
    <>
      <h3 className="text-lg">{t('Default Playing Option')}</h3>
      <div className="my-1">
        {t('Always start playing the session from the first issue')}
      </div>
      <div className="mt-2">
        <Switch
          checked={sessionSettings.skipToIssue}
          onChange={toggleSkipToIssue}
        />
      </div>
    </>
  );
}

export default observer(DefaultPlaying);
