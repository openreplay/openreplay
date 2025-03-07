import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import SessionsTabOverview from 'Shared/SessionsTabOverview/SessionsTabOverview';
import FFlagsList from 'Components/FFlags';
import NewFFlag from 'Components/FFlags/NewFFlag';
import { Routes, Route } from 'react-router';
import {
  sessions,
  fflags,
  withSiteId,
  newFFlag,
  fflag,
  fflagRead,
  bookmarks,
} from 'App/routes';
import { useLocation, useParams, useNavigate } from 'react-router';
import FlagView from 'Components/FFlags/FlagView/FlagView';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/mstore';
import Bookmarks from 'Shared/SessionsTabOverview/components/Bookmarks/Bookmarks';

function Overview() {
  const { searchStore } = useStore();
  const { siteId, fflagId } = useParams();
  const location = useLocation();
  const tab = location.pathname.split('/')[2];

  React.useEffect(() => {
    searchStore.setActiveTab(tab);
  }, [tab]);

  console.log(location.pathname)
  const renderContent = () => {
    const path = location.pathname;

    if (path.startsWith(withSiteId(sessions()), siteId)) {
      return (
        <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1360px' }}>
          <SessionsTabOverview />
        </div>
      );
    }

    if (path.startsWith(withSiteId(bookmarks()), siteId)) {
      return (
        <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1360px' }}>
          <Bookmarks />
        </div>
      );
    }

    if (path.startsWith(withSiteId(fflags()), siteId)) {
      return <FFlagsList siteId={siteId} />;
    }

    if (path.startsWith(withSiteId(newFFlag()), siteId)) {
      return <NewFFlag siteId={siteId} />;
    }

    if (path.match(new RegExp(`^${withSiteId(fflag(), siteId).replace(':fflagId', '\\d+')}$`))) {
      return <NewFFlag siteId={siteId} fflagId={fflagId} />;
    }

    if (path.match(new RegExp(`^${withSiteId(fflagRead(), siteId).replace(':fflagId', '\\d+')}$`))) {
      return <FlagView siteId={siteId} fflagId={fflagId!} />;
    }

    return (
      <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1360px' }}>
        <SessionsTabOverview />
      </div>
    );
  };

  return renderContent();
}

export default withPageTitle('Sessions - OpenReplay')(observer(Overview));