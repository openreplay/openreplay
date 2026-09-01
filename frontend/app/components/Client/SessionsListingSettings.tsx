import withPageTitle from 'HOCs/withPageTitle';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Divider } from 'UI';

import DefaultPlaying from 'Shared/SessionSettings/components/DefaultPlaying';
import DefaultTimezone from 'Shared/SessionSettings/components/DefaultTimezone';
import InactivitySettings from 'Shared/SessionSettings/components/InactivitySettings';
import ListingVisibility from 'Shared/SessionSettings/components/ListingVisibility';
import MouseTrailSettings from 'Shared/SessionSettings/components/MouseTrailSettings';
import VirtualModeSettings from 'Shared/SessionSettings/components/VirtualMode';

import DebugLog from './DebugLog';
import PreferencesPage from './PreferencesPage';

function SessionsListingSettings() {
  const { t } = useTranslation();
  return (
    <PreferencesPage title={t('Session Settings')}>
      <div className="flex flex-col">
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
          <InactivitySettings />
        </div>
      </div>
    </PreferencesPage>
  );
}

export default withPageTitle('Session Settings - OpenReplay Preferences')(
  SessionsListingSettings,
);
