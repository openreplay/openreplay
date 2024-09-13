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
  SPOT_ONBOARDING,
} from 'App/constants/storageKeys';
import Layout from 'App/layout/Layout';
import { withStore } from 'App/mstore';
import { checkParam, handleSpotJWT, isTokenExpired } from 'App/utils';
import { ModalProvider } from 'Components/Modal';
import { ModalProvider as NewModalProvider } from 'Components/ModalContext';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { setSessionPath } from 'Duck/sessions';
import { fetchList as fetchSiteList } from 'Duck/site';
import { init as initSite } from 'Duck/site';
import { fetchUserInfo, getScope, logout, setJwt } from 'Duck/user';
import { Loader } from 'UI';
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
  setSessionPath: (path: any) => any;
  fetchSiteList: (siteId?: number) => any;
  match: {
    params: {
      siteId: string;
    };
  };
  mstore: any;
  setJwt: (params: { jwt: string; spotJwt: string | null }) => any;
  fetchMetadata: (siteId: string) => void;
  initSite: (site: any) => void;
  scopeSetup: boolean;
  localSpotJwt: string | null;
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
    setSessionPath,
    scopeSetup,
    localSpotJwt,
    logout,
  } = props;

  const params = new URLSearchParams(location.search);
  const spotCb = params.get('spotCallback');
  const spotReqSent = React.useRef(false);
  const [isSpotCb, setIsSpotCb] = React.useState(false);
  const [isSignup, setIsSignup] = React.useState(false);
  const [isIframe, setIsIframe] = React.useState(false);
  const [isJwt, setIsJwt] = React.useState(false);

  const handleJwtFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const urlJWT = params.get('jwt');
    const spotJwt = params.get('spotJwt');
    if (spotJwt) {
      handleSpotLogin(spotJwt);
    }
    if (urlJWT) {
      props.setJwt({ jwt: urlJWT, spotJwt: spotJwt ?? null });
    }
  };

  const handleSpotLogin = (jwt: string) => {
    if (spotReqSent.current) {
      return;
    } else {
      spotReqSent.current = true;
      setIsSpotCb(false);
    }
    handleSpotJWT(jwt);
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
    if (isSpotCb) {
      localStorage.setItem(SPOT_ONBOARDING, 'true');
    }
    await fetchUserInfo();
    const siteIdFromPath = parseInt(location.pathname.split('/')[1]);
    await fetchSiteList(siteIdFromPath);
    props.mstore.initClient();

    if (localSpotJwt && !isTokenExpired(localSpotJwt)) {
      handleSpotLogin(localSpotJwt);
    }

    const destinationPath = localStorage.getItem(GLOBAL_DESTINATION_PATH);
    if (
      destinationPath &&
      !destinationPath.includes(routes.login()) &&
      !destinationPath.includes(routes.signup()) &&
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
    if (spotCb) {
      setIsSpotCb(true);
    }
    if (location.pathname.includes('signup')) {
      setIsSignup(true);
    }
  }, [spotCb]);

  useEffect(() => {
    handleDestinationPath();

    setSessionPath(previousLocation ? previousLocation : location);
  }, [location]);

  useEffect(() => {
    if (prevIsLoggedIn !== isLoggedIn && isLoggedIn) {
      void handleUserLogin();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && isSpotCb && !isSignup) {
      if (localSpotJwt && !isTokenExpired(localSpotJwt)) {
        handleSpotLogin(localSpotJwt);
      } else {
        logout();
      }
    }
  }, [isSpotCb, isLoggedIn, localSpotJwt, isSignup]);

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
    location.pathname.includes('/spots/') ||
    location.pathname.includes('/scope-setup');

  if (isIframe) {
    return (
      <IFrameRoutes isJwt={isJwt} isLoggedIn={isLoggedIn} loading={loading} />
    );
  }

  return isLoggedIn ? (
    <NewModalProvider>
      <ModalProvider>
        <Loader loading={loading} className="flex-1">
          <Layout hideHeader={hideHeader}>
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
  const scopeSetup = getScope(state) === 0;
  const loading =
    Boolean(userInfoLoading) ||
    Boolean(sitesLoading) ||
    (!scopeSetup && !siteId);
  return {
    siteId,
    changePassword,
    sites: state.getIn(['site', 'list']),
    jwt,
    localSpotJwt: state.getIn(['user', 'spotJwt']),
    isLoggedIn: jwt !== null && !changePassword,
    scopeSetup,
    loading,
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
  setSessionPath,
  fetchSiteList,
  setJwt,
  fetchMetadata,
  initSite,
  logout,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export default withStore(withRouter(connector(Router)));
