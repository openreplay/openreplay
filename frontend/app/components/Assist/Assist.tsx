import React from 'react';
import LiveSessionList from 'Shared/LiveSessionList';
import LiveSessionSearch from 'Shared/LiveSessionSearch';
import cn from 'classnames'
import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions'

function Assist() {
  return (
    <div className="page-margin container-90 flex relative">
        <div className="flex-1 flex">
          <div className={cn("w-full mx-auto")} style={{ maxWidth: '1300px'}}>
            <LiveSessionSearch />
            <div className="my-4" />
            <LiveSessionList />
          </div>
        </div>
    </div>
  )
}

export default withPageTitle("Assist - OpenReplay")(withPermissions(['ASSIST_LIVE'])(Assist));
