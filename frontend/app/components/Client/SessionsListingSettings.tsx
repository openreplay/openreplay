import withPageTitle from 'HOCs/withPageTitle';
import React from 'react';
import { Divider, PageTitle } from 'UI';

import DefaultPlaying from 'Shared/SessionSettings/components/DefaultPlaying';
import DefaultTimezone from 'Shared/SessionSettings/components/DefaultTimezone';
import ListingVisibility from 'Shared/SessionSettings/components/ListingVisibility';
import MouseTrailSettings from 'Shared/SessionSettings/components/MouseTrailSettings';
import VirtualModeSettings from '../shared/SessionSettings/components/VirtualMode';
import DebugLog from './DebugLog';
import { useTranslation } from 'react-i18next';

function SessionsListingSettings() {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <PageTitle title={<div>{t('Sessions Listing')}</div>} />

      <div className="flex flex-col mt-4">
        <div className="max-w-lg">
          <ListingVisibility />
        </div>

        <Divider />

        <div>
          <DefaultPlaying />
        </div>
        <Divider />

        <div>
          <DefaultTimezone />
        </div>
        <Divider />

        <div className="flex flex-col gap-2">
          <MouseTrailSettings />
          <DebugLog />
          <VirtualModeSettings />
        </div>
      </div>
    </div>
  );
}

export default withPageTitle('Sessions Listings - OpenReplay Preferences')(
  SessionsListingSettings,
);
