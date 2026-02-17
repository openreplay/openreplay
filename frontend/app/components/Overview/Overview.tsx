import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import SessionsTabOverview from 'Shared/SessionsTabOverview/SessionsTabOverview';
import { withRouter, RouteComponentProps, useLocation } from 'App/routing';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/mstore';
import Bookmarks from 'Shared/SessionsTabOverview/components/Bookmarks/Bookmarks';
import { PANEL_SIZES } from 'App/constants/panelSizes';

// @ts-ignore
interface IProps extends RouteComponentProps {
  match: {
    params: {
      siteId: string;
    };
  };
}

// TODO should move these routes to the Routes file
function Overview({ match: { params } }: IProps) {
  const { searchStore, projectsStore } = useStore();
  const location = useLocation();
  const tab = location.pathname.split('/')[2];

  React.useEffect(() => {
    searchStore.setActiveTab(tab);
  }, [tab]);

  if (tab === 'bookmarks') {
    return (
      <div
        className="mb-5 w-full mx-auto"
        style={{ maxWidth: PANEL_SIZES.maxWidth }}
      >
        <Bookmarks />
      </div>
    );
  }

  return (
    <div
      className="mb-5 w-full mx-auto"
      style={{ maxWidth: PANEL_SIZES.maxWidth }}
    >
      <SessionsTabOverview />
    </div>
  );
}

export default withPageTitle('Sessions - OpenReplay')(
  withRouter(observer(Overview)),
);
