import React, { useEffect, useRef } from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useHistory, useLocation, useParams } from 'App/routing';

const withSiteIdUpdater = (BaseComponent) => {
  function WrapperComponent(props) {
    const { projectsStore } = useStore();
    const { siteId } = projectsStore;
    const { setSiteId } = projectsStore;
    const params = useParams();
    const urlSiteId = params?.siteId;
    const location = useLocation();
    const history = useHistory();
    const prevSiteIdRef = useRef(siteId);
    const lastUrlSiteIdRef = useRef(urlSiteId);

    useEffect(() => {
      if (!urlSiteId) return;
      if (lastUrlSiteIdRef.current === urlSiteId) return;

      lastUrlSiteIdRef.current = urlSiteId;
      if (urlSiteId !== siteId) setSiteId(urlSiteId);
    }, [setSiteId, siteId, urlSiteId]);

    useEffect(() => {
      const { pathname } = location;

      const shouldUrlUpdate =
        urlSiteId && siteId && parseInt(urlSiteId, 10) !== parseInt(siteId, 10);
      if (shouldUrlUpdate) {
        const path = ['', siteId]
          .concat(pathname.split('/').slice(2))
          .join('/');
        history.push(path);
      }
      prevSiteIdRef.current = siteId;
    }, [history, location, siteId, urlSiteId]);

    const key = siteId;

    const passedProps = {
      ...props,
      siteId,
      setSiteId,
      urlSiteId,
      location,
      history,
      match: {
        params,
      },
    };
    return <BaseComponent key={key} {...passedProps} />;
  }

  return observer(WrapperComponent);
};

export default withSiteIdUpdater;
