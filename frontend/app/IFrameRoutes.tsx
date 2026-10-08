import { Loader } from '@/ui/feedback/Loader';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';
import { observer } from 'mobx-react-lite';
import React, { Suspense, lazy } from 'react';

import PublicRoutes from 'App/PublicRoutes';
import Tracker from 'App/Tracker';
import Layout from 'App/layout/Layout';
import { useStore } from 'App/mstore';
import { Route, StableRoutes } from 'App/routing';
import { ModalProvider } from 'Components/Modal';

import NotFoundPage from 'Shared/NotFoundPage';

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
        <Layout bare>
          <Loader loading={!!loading} className="flex-1">
            <Tracker />
            <Suspense fallback={<Loader loading className="flex-1" />}>
              <StableRoutes>
                <Route
                  path={withSiteId(SESSION_PATH, siteIdList)}
                  element={<enhancedComponents.Session />}
                />
                <Route
                  path={withSiteId(LIVE_SESSION_PATH, siteIdList)}
                  element={<enhancedComponents.LiveSession />}
                />
                <Route path="*" element={<NotFoundPage />} />
              </StableRoutes>
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
