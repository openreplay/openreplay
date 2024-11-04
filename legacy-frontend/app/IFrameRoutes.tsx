import React, { lazy, Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';
import { connect } from 'react-redux';
import { Loader } from 'UI';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';

import * as routes from './routes';
import { Map } from 'immutable';
import NotFoundPage from 'Shared/NotFoundPage';
import { ModalProvider } from 'Components/Modal';
import Layout from 'App/layout/Layout';
import PublicRoutes from 'App/PublicRoutes';

const components: any = {
  SessionPure: lazy(() => import('Components/Session/Session')),
  LiveSessionPure: lazy(() => import('Components/Session/LiveSession'))
};


const enhancedComponents: any = {
  Session: withSiteIdUpdater(components.SessionPure),
  LiveSession: withSiteIdUpdater(components.LiveSessionPure)
};

const withSiteId = routes.withSiteId;

const SESSION_PATH = routes.session();
const LIVE_SESSION_PATH = routes.liveSession();


interface Props {
  isEnterprise: boolean;
  tenantId: string;
  siteId: string;
  jwt: string;
  sites: Map<string, any>;
  onboarding: boolean;
  isJwt?: boolean;
  isLoggedIn?: boolean;
  loading: boolean;
}

function IFrameRoutes(props: Props) {
  const { isJwt = false, isLoggedIn = false, loading, onboarding, sites, siteId, jwt } = props;
  const siteIdList: any = sites.map(({ id }) => id).toJS();

  if (isLoggedIn) {
    return (
      <ModalProvider>
        <Layout hideHeader={true}>
          <Loader loading={!!loading} className='flex-1'>
            <Suspense fallback={<Loader loading={true} className='flex-1' />}>
              <Switch key='content'>
                <Route exact strict path={withSiteId(SESSION_PATH, siteIdList)}
                       component={enhancedComponents.Session} />
                <Route exact strict path={withSiteId(LIVE_SESSION_PATH, siteIdList)}
                       component={enhancedComponents.LiveSession} />
                <Route path='*' render={NotFoundPage} />
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


export default connect((state: any) => ({
  changePassword: state.getIn(['user', 'account', 'changePassword']),
  onboarding: state.getIn(['user', 'onboarding']),
  sites: state.getIn(['site', 'list']),
  siteId: state.getIn(['site', 'siteId']),
  jwt: state.getIn(['user', 'jwt']),
  tenantId: state.getIn(['user', 'account', 'tenantId']),
  isEnterprise:
    state.getIn(['user', 'account', 'edition']) === 'ee' ||
    state.getIn(['user', 'authDetails', 'edition']) === 'ee'
}))(IFrameRoutes);