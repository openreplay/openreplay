import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';

import { useStore } from 'App/mstore';
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
    const lastUrlSiteIdRef = useRef(urlSiteId);

    // one effect, so a render can't act on both sides: a link or back/forward
    // moves the address and the project follows; the switcher moves the
    // project and the address follows
    useEffect(() => {
      if (!urlSiteId) return;
      if (lastUrlSiteIdRef.current !== urlSiteId) {
        lastUrlSiteIdRef.current = urlSiteId;
        if (urlSiteId !== siteId) setSiteId(urlSiteId);
        return;
      }
      if (siteId && parseInt(urlSiteId, 10) !== parseInt(siteId, 10)) {
        const path = ['', siteId]
          .concat(location.pathname.split('/').slice(2))
          .join('/');
        history.push(path);
      }
    }, [history, location, setSiteId, siteId, urlSiteId]);

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
