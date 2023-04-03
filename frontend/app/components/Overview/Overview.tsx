import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import NoSessionsMessage from 'Shared/NoSessionsMessage';
import MainSearchBar from 'Shared/MainSearchBar';
import SessionSearch from 'Shared/SessionSearch';
import SessionsTabOverview from 'Shared/SessionsTabOverview/SessionsTabOverview';
import cn from 'classnames';
import OverviewMenu from 'Shared/OverviewMenu';
import FFlagsList from "Components/FFlags";
import { Switch, Route } from 'react-router';
import { sessions, fflags, withSiteId } from "App/routes";
import { withRouter, RouteComponentProps } from 'react-router-dom';

// @ts-ignore
interface IProps extends RouteComponentProps {
  match: {
    params: {
      siteId: string;
    }
  }
}

function Overview({ match: { params } }: IProps) {
  const { siteId } = params;
  return (
    <div className="page-margin container-90 flex relative">
      <div className={cn('side-menu')}>
        <OverviewMenu />
      </div>
      <div
        className={cn("side-menu-margined w-full")}
      >
        <Switch>
          <Route exact strict path={withSiteId(sessions(), siteId)}>
            <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1300px' }}>
              <NoSessionsMessage />
              <MainSearchBar />
              <SessionSearch />
              <div className="my-4" />
              <SessionsTabOverview />
            </div>
          </Route>
          <Route exact strict path={withSiteId(fflags(), siteId)}>
            <FFlagsList />
          </Route>
        </Switch>
      </div>
    </div>
  );
}

export default withPageTitle('Sessions - OpenReplay')(withRouter(Overview));
