import React, { useEffect } from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import NoSessionsMessage from 'Shared/NoSessionsMessage';
import MainSearchBar from 'Shared/MainSearchBar';
import SessionSearch from 'Shared/SessionSearch';
import SessionsTabOverview from 'Shared/SessionsTabOverview/SessionsTabOverview';
import FFlagsList from 'Components/FFlags';
import NewFFlag from 'Components/FFlags/NewFFlag';
import { Switch, Route } from 'react-router';
import { sessions, fflags, withSiteId, newFFlag, fflag, notes, fflagRead, bookmarks } from 'App/routes';
import { withRouter, RouteComponentProps, useLocation } from 'react-router-dom';
import FlagView from 'Components/FFlags/FlagView/FlagView';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/mstore';
import NotesList from 'Shared/SessionsTabOverview/components/Notes/NoteList';
import NoteTags from 'Shared/SessionsTabOverview/components/Notes/NoteTags';

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
  const { searchStore } = useStore();
  const { siteId, fflagId } = params;
  const location = useLocation();
  const tab = location.pathname.split('/')[2];

  React.useEffect(() => {
    searchStore.setActiveTab(tab);
  }, [tab]);

  return (
    <Switch>
      <Route exact strict
             path={[withSiteId(sessions(), siteId), withSiteId(bookmarks(), siteId)]}>
        <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1360px' }}>
          <SessionsTabOverview />
        </div>
      </Route>
      <Route exact strict path={withSiteId(notes(), siteId)}>
        <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1360px' }}>
          <NotesList />
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

export default withPageTitle('Sessions - OpenReplay')(withRouter(observer(Overview)));
