import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import ListingVisibility from './components/ListingVisibility';
import DefaultPlaying from './components/DefaultPlaying';
import DefaultTimezone from './components/DefaultTimezone';
import CaptureRate from './components/CaptureRate';

import { useTranslation } from 'react-i18next';

function SessionSettings() {
  const { projectsStore } = useStore();
  const projectId = projectsStore.siteId;
  const { t } = useTranslation();

  return (
    <div className="bg-white box-shadow h-screen overflow-y-auto">
      <div className="px-6 pt-6">
        <h1 className="text-2xl">{t('Sessions Settings')}</h1>
      </div>

      <div className="p-6 border-b py-8">
        <ListingVisibility />
      </div>

      <div className="p-6 border-b py-8">
        <DefaultPlaying />
      </div>

      <div className="p-6 border-b py-8">
        <DefaultTimezone />
      </div>

      <div className="p-6 py-8">
        <h3 className="text-lg">{t('Capture Rate')}</h3>
        <CaptureRate projectId={projectId} />
      </div>
    </div>
  );
}

export default observer(SessionSettings);
