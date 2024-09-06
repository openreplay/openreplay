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
  SPOT_ONBOARDING
} from "App/constants/storageKeys";
import Layout from 'App/layout/Layout';
import { withStore } from "App/mstore";
import { checkParam, handleSpotJWT } from "App/utils";
import { ModalProvider } from 'Components/Modal';
import { ModalProvider as NewModalProvider } from 'Components/ModalContext';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { setSessionPath } from 'Duck/sessions';
import { fetchList as fetchSiteList } from 'Duck/site';
import { init as initSite } from 'Duck/site';
import { fetchUserInfo, getScope, setJwt } from "Duck/user";
import { fetchTenants } from 'Duck/user';
import { Loader } from 'UI';
import { spotsList } from "./routes";
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
  setJwt: (params: { jwt: string, spotJwt: string | null }) => any;
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
  } = props;

  const params = new URLSearchParams(location.search)
  const spotCb = params.get('spotCallback');
  const spotReqSent = React.useRef(false)
  const [isIframe, setIsIframe] = React.useState(false);
  const [isJwt, setIsJwt] = React.useState(false);

  const handleJwtFromUrl = () => {
    const params = new URLSearchParams(location.search)
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
    handleDestinationPath();

    setSessionPath(previousLocation ? previousLocation : location);
  }, [location]);

  useEffect(() => {
    if (prevIsLoggedIn !== isLoggedIn && isLoggedIn) {
      void handleUserLogin();
      if (spotCb) {
        history.push(spotsList())
        localStorage.setItem(SPOT_ONBOARDING, 'true')
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (scopeSetup) {
      history.push(routes.scopeSetup())
    }
  }, [scopeSetup])

  useEffect(() => {
    if (isLoggedIn && location.pathname.includes('login') && localSpotJwt) {
      handleSpotLogin(localSpotJwt);
    }
  }, [location, isLoggedIn, localSpotJwt])

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
    location.pathname.includes('/scope-setup')


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
  const scopeSetup = getScope(state) === 0
  const loading = Boolean(userInfoLoading) || Boolean(sitesLoading) || (!scopeSetup && !siteId);
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
  fetchTenants,
  setSessionPath,
  fetchSiteList,
  setJwt,
  fetchMetadata,
  initSite,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export default withStore(withRouter(connector(Router)));
