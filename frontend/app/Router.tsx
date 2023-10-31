import React, { useEffect, useRef } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { connect, ConnectedProps } from 'react-redux';
import { Notification } from 'UI';
import { Loader } from 'UI';
import { fetchUserInfo, setJwt } from 'Duck/user';
import { fetchList as fetchSiteList } from 'Duck/site';
import { withStore } from 'App/mstore';
import { Map } from 'immutable';

import * as routes from './routes';
import { fetchTenants } from 'Duck/user';
import { setSessionPath } from 'Duck/sessions';
import { ModalProvider } from 'Components/Modal';
import { GLOBAL_DESTINATION_PATH, IFRAME, JWT_PARAM } from 'App/constants/storageKeys';
import PublicRoutes from 'App/PublicRoutes';
import Layout from 'App/layout/Layout';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { init as initSite } from 'Duck/site';
import PrivateRoutes from 'App/PrivateRoutes';
import { checkParam } from 'App/utils';
import IFrameRoutes from 'App/IFrameRoutes';

interface RouterProps extends RouteComponentProps, ConnectedProps<typeof connector> {
  isLoggedIn: boolean;
  sites: Map<string, any>;
  loading: boolean;
  changePassword: boolean;
  isEnterprise: boolean;
  fetchUserInfo: () => any;
  fetchTenants: () => any;
  setSessionPath: (path: any) => any;
  fetchSiteList: (siteId?: number) => any;
  match: {
    params: {
      siteId: string;
    }
  };
  mstore: any;
  setJwt: (jwt: string) => any;
  fetchMetadata: (siteId: string) => void;
  initSite: (site: any) => void;
}

const Router: React.FC<RouterProps> = (props) => {
  const {
    isLoggedIn,
    siteId,
    sites,
    loading,
    location,
    fetchUserInfo,
    fetchSiteList,
    history,
    match: { params: { siteId: siteIdFromPath } },
    setSessionPath,
  } = props;
  const [isIframe, setIsIframe] = React.useState(false);
  const [isJwt, setIsJwt] = React.useState(false);

  const handleJwtFromUrl = () => {
    const urlJWT = new URLSearchParams(location.search).get('jwt');
    if (urlJWT && !isLoggedIn) {
      props.setJwt(urlJWT);
    }
  };

  const handleDestinationPath = () => {
    if (!isLoggedIn && location.pathname !== routes.login()) {
      localStorage.setItem(GLOBAL_DESTINATION_PATH, location.pathname);
    }
  };

  const handleUserLogin = async () => {
    await fetchUserInfo();
    const siteIdFromPath = parseInt(location.pathname.split('/')[1]);
    await fetchSiteList(siteIdFromPath);
    props.mstore.initClient();

    const destinationPath = localStorage.getItem(GLOBAL_DESTINATION_PATH);
    if (
      destinationPath &&
      destinationPath !== routes.login() &&
      destinationPath !== '/'
    ) {
      history.push(destinationPath + location.search);
      localStorage.removeItem(GLOBAL_DESTINATION_PATH);
    }
  };

  useEffect(() => {
    setIsIframe(checkParam('iframe', IFRAME));
    setIsJwt(checkParam('jwt', JWT_PARAM));
  }, []);

  useEffect(() => {
    handleJwtFromUrl();
    handleDestinationPath();


    setSessionPath(previousLocation ? previousLocation : location);
  }, [location]);

  useEffect(() => {
    if (prevIsLoggedIn !== isLoggedIn && isLoggedIn) {
      handleUserLogin();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (siteId && siteId !== lastFetchedSiteIdRef.current) {
      const activeSite = sites.find((s) => s.id == siteId);
      props.initSite(activeSite);
      props.fetchMetadata(siteId);
      lastFetchedSiteIdRef.current = siteId;
    }
  }, [siteId]);

  const lastFetchedSiteIdRef = useRef<any>(null);

  function usePrevious(value: any) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    }, [value]);
    return ref.current;
  }

  const prevIsLoggedIn = usePrevious(isLoggedIn);
  const previousLocation = usePrevious(location);

  const hideHeader = (location.pathname && location.pathname.includes('/session/')) ||
    location.pathname.includes('/assist/') || location.pathname.includes('multiview');

  if (isIframe) {
    return <IFrameRoutes isJwt={isJwt} isLoggedIn={isLoggedIn} loading={loading} />;
  }

  return isLoggedIn ? (
    <ModalProvider>
      <Loader loading={loading || !siteId} className='flex-1'>
        <Layout hideHeader={hideHeader} siteId={siteId}>
          <Notification />
          <PrivateRoutes />
        </Layout>
      </Loader>
    </ModalProvider>
  ) : <PublicRoutes />;
};

const mapStateToProps = (state: Map<string, any>) => {
  const siteId = state.getIn(['site', 'siteId']);
  const jwt = state.getIn(['user', 'jwt']);
  const changePassword = state.getIn(['user', 'account', 'changePassword']);
  const userInfoLoading = state.getIn(['user', 'fetchUserInfoRequest', 'loading']);
  const sitesLoading = state.getIn(['site', 'fetchListRequest', 'loading']);

  return {
    siteId,
    changePassword,
    sites: state.getIn(['site', 'list']),
    isLoggedIn: jwt !== null && !changePassword,
    loading: siteId === null || userInfoLoading || sitesLoading,
    email: state.getIn(['user', 'account', 'email']),
    account: state.getIn(['user', 'account']),
    organisation: state.getIn(['user', 'account', 'name']),
    tenantId: state.getIn(['user', 'account', 'tenantId']),
    tenants: state.getIn(['user', 'tenants']),
    isEnterprise:
      state.getIn(['user', 'account', 'edition']) === 'ee' ||
      state.getIn(['user', 'authDetails', 'edition']) === 'ee'
  };
};

const mapDispatchToProps = {
  fetchUserInfo,
  fetchTenants,
  setSessionPath,
  fetchSiteList,
  setJwt,
  fetchMetadata,
  initSite
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export default withStore(withRouter(connector(Router)));
