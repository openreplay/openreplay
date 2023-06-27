import React from 'react';
import { connect } from 'react-redux';
import { PageTitle } from 'UI';
import ListingVisibility from 'Shared/SessionSettings/components/ListingVisibility';
import DefaultPlaying from 'Shared/SessionSettings/components/DefaultPlaying';
import DefaultTimezone from 'Shared/SessionSettings/components/DefaultTimezone';
import withPageTitle from 'HOCs/withPageTitle';

type Props = {}

const mapStateToProps = (state: any) => ({
  isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
  account: state.getIn(['user', 'account'])
});

const connector = connect(mapStateToProps);

function SessionsListingSettings(props: Props) {
  return (
    <div className='p-5'>
      <PageTitle title={<div>Sessions Listings</div>} />

      <div className='flex flex-col gap-6 mt-4'>
        <div className='max-w-lg'>
          <ListingVisibility />
        </div>

        <div className='border-b' />


        <div>
          <DefaultPlaying />
        </div>
        <div className='border-b' />


        <div>
          <DefaultTimezone />
        </div>

      </div>
    </div>
  );
}

export default connector(
  withPageTitle('Sessions Listings - OpenReplay Preferences')(SessionsListingSettings)
);