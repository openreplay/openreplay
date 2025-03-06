import React, { useEffect, useRef } from 'react';
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
import { useStore } from 'App/mstore';
import { checkParam, handleSpotJWT, isTokenExpired } from 'App/utils';
import { ModalProvider } from 'Components/Modal';
import { ModalProvider as NewModalProvider } from 'Components/ModalContext';
import { Loader } from 'UI';
import { observer } from 'mobx-react-lite';
import * as routes from './routes';

interface RouterProps extends RouteComponentProps {
  match: {
    params: {
      siteId: string;
    };
  };
}

const Router: React.FC<RouterProps> = (props) => {
  const { location, history } = props;
  const mstore = useStore();
  const {
    customFieldStore,
    projectsStore,
    sessionStore,
    searchStore,
    userStore,
  } = mstore;
  const { jwt } = userStore;
  const { changePassword } = userStore.account;
  const userInfoLoading = userStore.fetchInfoRequest.loading;
  const scopeSetup = userStore.scopeState === 0;
  const localSpotJwt = userStore.spotJwt;
  const isLoggedIn = Boolean(jwt && !changePassword);
  const { fetchUserInfo } = userStore;
  const setJwt = userStore.updateJwt;
  const { logout } = userStore;

  const { setSessionPath } = sessionStore;
  const { siteId } = projectsStore;
  const { sitesLoading } = projectsStore;
  const sites = projectsStore.list;
  const loading = Boolean(
    userInfoLoading || (!scopeSetup && !siteId) || sitesLoading,
  );
  const initSite = projectsStore.initProject;
  const fetchSiteList = projectsStore.fetchList;

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
      setJwt({ jwt: urlJWT, spotJwt: spotJwt ?? null });
    }
  };

  const handleSpotLogin = (jwt: string) => {
    if (spotReqSent.current) {
      return;
    }
    spotReqSent.current = true;
    setIsSpotCb(false);

    handleSpotJWT(jwt);
  };

  const handleDestinationPath = () => {
    if (!isLoggedIn && location.pathname !== routes.login()) {
      localStorage.setItem(
        GLOBAL_DESTINATION_PATH,
        location.pathname + location.search,
      );
    }
  };

  const handleUserLogin = async () => {
    if (isSpotCb) {
      localStorage.setItem(SPOT_ONBOARDING, 'true');
    }
    await fetchUserInfo();
    const siteIdFromPath = location.pathname.split('/')[1];
    await fetchSiteList(siteIdFromPath);
    mstore.initClient();

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
    mstore.initClient();
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

    setSessionPath(previousLocation || location);
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
        void logout();
      }
    }
  }, [isSpotCb, isLoggedIn, localSpotJwt, isSignup]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchData = async () => {
      if (siteId && siteId !== lastFetchedSiteIdRef.current) {
        const activeSite = sites.find((s) => s.id == siteId);
        initSite(activeSite ?? {});
        lastFetchedSiteIdRef.current = activeSite?.id;
        await customFieldStore.fetchListActive(`${siteId}`);
        await searchStore.fetchSavedSearchList();
      }
    };

    void fetchData();
  }, [siteId, isLoggedIn]);

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

export default withRouter(observer(Router));
