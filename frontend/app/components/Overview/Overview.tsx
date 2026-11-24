import withPageTitle from 'HOCs/withPageTitle';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { RouteComponentProps, useLocation, withRouter } from 'App/routing';

import SessionsTabOverview from 'Shared/SessionsTabOverview/SessionsTabOverview';
import Bookmarks from 'Shared/SessionsTabOverview/components/Bookmarks/Bookmarks';

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
  const location = useLocation();
  const tab = location.pathname.split('/')[2];

  return tab === 'bookmarks' ? <Bookmarks /> : <SessionsTabOverview />;
}

export default withPageTitle('Sessions - OpenReplay')(
  withRouter(observer(Overview)),
);
