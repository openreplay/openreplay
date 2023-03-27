import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import NoSessionsMessage from 'Shared/NoSessionsMessage';
import MainSearchBar from 'Shared/MainSearchBar';
import SessionSearch from 'Shared/SessionSearch';
import SessionListContainer from 'Shared/SessionListContainer/SessionListContainer';
import cn from 'classnames';
import OverviewMenu from 'Shared/OverviewMenu';

function Overview() {
  return (
    <div className="page-margin container-90">
      <div className={cn('side-menu')}>
        <OverviewMenu />
      </div>
      <div
        className={cn("side-menu-margined")}
      >
        <NoSessionsMessage />

        <div className="mb-5">
          <MainSearchBar />
          <SessionSearch />

          <div className="my-4" />
          <SessionListContainer />
        </div>
      </div>
    </div>
  );
}

export default withPageTitle('Sessions - OpenReplay')(Overview);
