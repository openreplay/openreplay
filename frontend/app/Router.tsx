import { Map } from 'immutable';
import React, { useEffect, useRef } from 'react';
import { ConnectedProps, connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import IFrameRoutes from 'App/IFrameRoutes';
import PrivateRoutes from 'App/PrivateRoutes';
import PublicRoutes from 'App/PublicRoutes';
import {
  GLOBAL_DESTINATION_PATH,
  IFRAME,
  JWT_PARAM,
} from 'App/constants/storageKeys';
import Layout from 'App/layout/Layout';
import { withStore } from 'App/mstore';
import { checkParam } from 'App/utils';
import { ModalProvider } from 'Components/Modal';
import { ModalProvider as NewModalProvider } from 'Components/ModalContext';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { setSessionPath } from 'Duck/sessions';
import { fetchList as fetchSiteList } from 'Duck/site';
import { init as initSite } from 'Duck/site';
import { fetchUserInfo, setJwt } from 'Duck/user';
import { fetchTenants } from 'Duck/user';
import { Loader } from 'UI';
import { toast } from 'react-toastify'
import * as routes from './routes';

interface RouterProps
  extends RouteComponentProps,
    ConnectedProps<typeof connector> {
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
    };
  };
  mstore: any;
  setJwt: (jwt: string) => any;
  fetchMetadata: (siteId: string) => void;
  initSite: (site: any) => void;
}

const Router: React.FC<RouterProps> = (props) => {
  const searchParams = new URLSearchParams(window.location.search);
  const spotUrl = searchParams.get('spotCallback');

  const {
    isLoggedIn,
    siteId,
    sites,
    loading,
    location,
    fetchUserInfo,
    fetchSiteList,
    history,
    match: {
      params: { siteId: siteIdFromPath },
    },
    setSessionPath,
    jwt,
  } = props;
  const [spotLoginUrl, setSpotLogin] = React.useState(spotUrl);
  const [isIframe, setIsIframe] = React.useState(false);
  const [isJwt, setIsJwt] = React.useState(false);

  const handleJwtFromUrl = () => {
    const urlJWT = new URLSearchParams(location.search).get('jwt');
    if (urlJWT) {
      props.setJwt(urlJWT);
    }
  };

  const handleDestinationPath = () => {
    if (!isLoggedIn && location.pathname !== routes.login()) {
      localStorage.setItem(
        GLOBAL_DESTINATION_PATH,
        location.pathname + location.search
      );
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
      destinationPath !== routes.signup() &&
      destinationPath !== '/'
    ) {
      const url = new URL(destinationPath, window.location.origin);
      checkParams(url.search);
      history.push(destinationPath);
      localStorage.removeItem(GLOBAL_DESTINATION_PATH);
    }
  };

  const checkParams = (search?: string) => {
    const _isIframe = checkParam('iframe', IFRAME, search);
    const _isJwt = checkParam('jwt', JWT_PARAM, search);
    setIsIframe(_isIframe);
    setIsJwt(_isJwt);
  };

  useEffect(() => {
    checkParams();
    handleJwtFromUrl();
  }, []);

  useEffect(() => {
    // handleJwtFromUrl();
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

  const hideHeader =
    (location.pathname && location.pathname.includes('/session/')) ||
    location.pathname.includes('/assist/') ||
    location.pathname.includes('multiview') ||
    location.pathname.includes('/view-spot/') ||
    location.pathname.includes('/spots/');

  if (isIframe) {
    return (
      <IFrameRoutes isJwt={isJwt} isLoggedIn={isLoggedIn} loading={loading} />
    );
  }

  React.useEffect(() => {
    if (isLoggedIn && spotLoginUrl) {
      let tries = 0
      window.addEventListener('message', (event) => {
        if (event.data.type === 'orspot:logged') {
          clearInterval(int)
          toast.success('You have been logged into Spot successfully');
          history.push(routes.spotsList())
        }
      })
      const int = setInterval(() => {
        if (tries > 20) {
          clearInterval(int)
          toast.error('Failed to log into Spot')
          return
        }
        window.postMessage({
          type: "orspot:token", token: jwt
        }, '*')
        tries += 1
      }, 250)
      // check permissions, show error notifications if not exist in EE ?
    }
  }, [isLoggedIn, spotLoginUrl])


  return isLoggedIn ? (
    <NewModalProvider>
      <ModalProvider>
        <Loader loading={loading || !siteId} className="flex-1">
          <Layout hideHeader={hideHeader} siteId={siteId}>
            <PrivateRoutes />
          </Layout>
        </Loader>
      </ModalProvider>
    </NewModalProvider>
  ) : (
    <PublicRoutes />
  );
};

const mapStateToProps = (state: Map<string, any>) => {
  const siteId = state.getIn(['site', 'siteId']);
  const jwt = state.getIn(['user', 'jwt']);
  const changePassword = state.getIn(['user', 'account', 'changePassword']);
  const userInfoLoading = state.getIn([
    'user',
    'fetchUserInfoRequest',
    'loading',
  ]);
  const sitesLoading = state.getIn(['site', 'fetchListRequest', 'loading']);

  return {
    siteId,
    changePassword,
    sites: state.getIn(['site', 'list']),
    jwt,
    isLoggedIn: jwt !== null && !changePassword,
    loading: siteId === null || userInfoLoading || sitesLoading,
    email: state.getIn(['user', 'account', 'email']),
    account: state.getIn(['user', 'account']),
    organisation: state.getIn(['user', 'account', 'name']),
    tenantId: state.getIn(['user', 'account', 'tenantId']),
    tenants: state.getIn(['user', 'tenants']),
    isEnterprise:
      state.getIn(['user', 'account', 'edition']) === 'ee' ||
      state.getIn(['user', 'authDetails', 'edition']) === 'ee',
  };
};

const mapDispatchToProps = {
  fetchUserInfo,
  fetchTenants,
  setSessionPath,
  fetchSiteList,
  setJwt,
  fetchMetadata,
  initSite,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export default withStore(withRouter(connector(Router)));
