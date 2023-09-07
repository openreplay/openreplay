import React from 'react';
import { connect } from 'react-redux';
import { PageTitle, Divider } from 'UI';
import ListingVisibility from 'Shared/SessionSettings/components/ListingVisibility';
import DefaultPlaying from 'Shared/SessionSettings/components/DefaultPlaying';
import DefaultTimezone from 'Shared/SessionSettings/components/DefaultTimezone';
import withPageTitle from 'HOCs/withPageTitle';
import MouseTrailSettings from 'Shared/SessionSettings/components/MouseTrailSettings';


type Props = {}

const mapStateToProps = (state: any) => ({
  isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
  account: state.getIn(['user', 'account'])
});

const connector = connect(mapStateToProps);

function SessionsListingSettings(props: Props) {
  return (
    <div className='bg-white rounded-lg p-5'>
      <PageTitle title={<div>Sessions Listing</div>} />

      <div className='flex flex-col mt-4'>
        <div className='max-w-lg'>
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

export default connector(
  withPageTitle('Sessions Listings - OpenReplay Preferences')(SessionsListingSettings)
);