import withPageTitle from 'HOCs/withPageTitle';
import React from 'react';
import { Divider, PageTitle } from 'UI';

import DefaultPlaying from 'Shared/SessionSettings/components/DefaultPlaying';
import DefaultTimezone from 'Shared/SessionSettings/components/DefaultTimezone';
import ListingVisibility from 'Shared/SessionSettings/components/ListingVisibility';
import MouseTrailSettings from 'Shared/SessionSettings/components/MouseTrailSettings';

function SessionsListingSettings() {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <PageTitle title={<div>Sessions Listing</div>} />

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

        <div>
          <MouseTrailSettings />
        </div>
      </div>
    </div>
  );
}

export default withPageTitle('Sessions Listings - OpenReplay Preferences')(
  SessionsListingSettings
);
