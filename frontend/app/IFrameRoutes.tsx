import React, { lazy, Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';
import { Loader } from 'UI';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';

import NotFoundPage from 'Shared/NotFoundPage';
import { ModalProvider } from 'Components/Modal';
import Layout from 'App/layout/Layout';
import PublicRoutes from 'App/PublicRoutes';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import * as routes from './routes';

const components: any = {
  SessionPure: lazy(() => import('Components/Session/Session')),
  LiveSessionPure: lazy(() => import('Components/Session/LiveSession')),
};

const enhancedComponents: any = {
  Session: withSiteIdUpdater(components.SessionPure),
  LiveSession: withSiteIdUpdater(components.LiveSessionPure),
};

const { withSiteId } = routes;

const SESSION_PATH = routes.session();
const LIVE_SESSION_PATH = routes.liveSession();

interface Props {
  isJwt?: boolean;
  isLoggedIn?: boolean;
  loading: boolean;
}

function IFrameRoutes(props: Props) {
  const { projectsStore } = useStore();
  const sites = projectsStore.list;
  const { isJwt = false, isLoggedIn = false, loading } = props;
  const siteIdList: any = sites.map(({ id }) => id);

  if (isLoggedIn) {
    return (
      <ModalProvider>
        <Layout hideHeader>
          <Loader loading={!!loading} className="flex-1">
            <Suspense fallback={<Loader loading className="flex-1" />}>
              <Switch key="content">
                <Route
                  exact
                  strict
                  path={withSiteId(SESSION_PATH, siteIdList)}
                  component={enhancedComponents.Session}
                />
                <Route
                  exact
                  strict
                  path={withSiteId(LIVE_SESSION_PATH, siteIdList)}
                  component={enhancedComponents.LiveSession}
                />
                <Route path="*" render={NotFoundPage} />
              </Switch>
            </Suspense>
          </Loader>
        </Layout>
      </ModalProvider>
    );
  }

  if (isJwt) {
    return <NotFoundPage />;
  }

  return <PublicRoutes />;
}

export default observer(IFrameRoutes);
