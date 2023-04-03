import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import NoSessionsMessage from 'Shared/NoSessionsMessage';
import MainSearchBar from 'Shared/MainSearchBar';
import SessionSearch from 'Shared/SessionSearch';
import SessionsTabOverview from 'Shared/SessionsTabOverview/SessionsTabOverview';
import cn from 'classnames';
import OverviewMenu from 'Shared/OverviewMenu';
import { connect } from 'react-redux';
import FFlagsList from "Components/FFlags";

function Overview({ activeTab }: { activeTab: string }) {
  return (
    <div className="page-margin container-90 flex relative">
      <div className={cn('side-menu')}>
        <OverviewMenu />
      </div>
      <div
        className={cn("side-menu-margined w-full")}
      >
        {activeTab !== 'flags' ? (
          <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1300px' }}>
            <NoSessionsMessage />
            <MainSearchBar />
            <SessionSearch />

            <div className="my-4" />
            <SessionsTabOverview />
          </div>
        ) : (
          <FFlagsList />
        )}
      </div>
    </div>
  );
}

export default connect(
  (state) => ({
    // @ts-ignore
    activeTab: state.getIn(['search', 'activeTab', 'type']),
  }),
)(withPageTitle('Sessions - OpenReplay')(Overview));
