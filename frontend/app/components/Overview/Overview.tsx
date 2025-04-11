import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import SessionsTabOverview from 'Shared/SessionsTabOverview/SessionsTabOverview';
import FFlagsList from 'Components/FFlags';
import NewFFlag from 'Components/FFlags/NewFFlag';
import { Switch, Route } from 'react-router';
import {
  sessions,
  fflags,
  withSiteId,
  newFFlag,
  fflag,
  fflagRead,
  bookmarks,
} from 'App/routes';
import { withRouter, RouteComponentProps, useLocation } from 'react-router-dom';
import FlagView from 'Components/FFlags/FlagView/FlagView';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/mstore';
import Bookmarks from 'Shared/SessionsTabOverview/components/Bookmarks/Bookmarks';

// @ts-ignore
interface IProps extends RouteComponentProps {
  match: {
    params: {
      siteId: string;
      fflagId?: string;
    };
  };
}
// TODO should move these routes to the Routes file
function Overview({ match: { params } }: IProps) {
  const { searchStore } = useStore();
  const { siteId, fflagId } = params;
  const location = useLocation();
  const tab = location.pathname.split('/')[2];

  React.useEffect(() => {
    searchStore.setActiveTab(tab);
  }, [tab]);

  return (
    <Switch>
      <Route exact strict path={withSiteId(sessions(), siteId)}>
        <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1360px' }}>
          <SessionsTabOverview />
        </div>
      </Route>
      <Route exact strict path={withSiteId(bookmarks(), siteId)}>
        <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1360px' }}>
          <Bookmarks />
        </div>
      </Route>
      <Route exact strict path={withSiteId(fflags(), siteId)}>
        <FFlagsList siteId={siteId} />
      </Route>
      <Route exact strict path={withSiteId(newFFlag(), siteId)}>
        <NewFFlag siteId={siteId} />
      </Route>
      <Route exact strict path={withSiteId(fflag(), siteId)}>
        <NewFFlag siteId={siteId} fflagId={fflagId} />
      </Route>
      <Route exact strict path={withSiteId(fflagRead(), siteId)}>
        <FlagView siteId={siteId} fflagId={fflagId!} />
      </Route>
    </Switch>
  );
}

export default withPageTitle('Sessions - OpenReplay')(
  withRouter(observer(Overview)),
);
