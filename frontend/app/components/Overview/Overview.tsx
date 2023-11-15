import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import NoSessionsMessage from 'Shared/NoSessionsMessage';
import MainSearchBar from 'Shared/MainSearchBar';
import SessionSearch from 'Shared/SessionSearch';
import SessionsTabOverview from 'Shared/SessionsTabOverview/SessionsTabOverview';
import cn from 'classnames';
import OverviewMenu from 'Shared/OverviewMenu';
import FFlagsList from 'Components/FFlags';
import NewFFlag from 'Components/FFlags/NewFFlag';
import { Switch, Route } from 'react-router';
import { sessions, fflags, withSiteId, newFFlag, fflag, notes, fflagRead, bookmarks } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import FlagView from 'Components/FFlags/FlagView/FlagView';

// @ts-ignore
interface IProps extends RouteComponentProps {
  match: {
    params: {
      siteId: string;
      fflagId?: string;
    };
  };
}

function Overview({ match: { params } }: IProps) {
  const { siteId, fflagId } = params;

  return (
    <Switch>
      <Route exact strict
             path={[withSiteId(sessions(), siteId), withSiteId(notes(), siteId), withSiteId(bookmarks(), siteId)]}>
        <div className='mb-5 w-full mx-auto' style={{ maxWidth: '1360px' }}>
          <NoSessionsMessage siteId={siteId} />
          <MainSearchBar />
          <SessionSearch />
          <div className='my-4' />
          <SessionsTabOverview />
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

export default withPageTitle('Sessions - OpenReplay')(withRouter(Overview));
