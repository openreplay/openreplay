import React, { useEffect, useRef } from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const withSiteIdUpdater = (BaseComponent) => {
  function WrapperComponent(props) {
    const { projectsStore } = useStore();
    const { siteId } = projectsStore;
    const { setSiteId } = projectsStore;
    const urlSiteId = props.match.params.siteId;
    const prevSiteIdRef = useRef(siteId);

    useEffect(() => {
      if (urlSiteId && urlSiteId !== siteId) {
        setSiteId(urlSiteId);
      }
    }, []);

    useEffect(() => {
      const {
        location: { pathname },
        history,
      } = props;

      const shouldUrlUpdate =
        urlSiteId && parseInt(urlSiteId, 10) !== parseInt(siteId, 10);
      if (shouldUrlUpdate) {
        const path = ['', siteId]
          .concat(pathname.split('/').slice(2))
          .join('/');
        history.push(path);
      }
      prevSiteIdRef.current = siteId;
    }, [urlSiteId, siteId, props.location.pathname, props.history]);

    const key = siteId;

    const passedProps = {
      ...props,
      siteId,
      setSiteId,
      urlSiteId,
    };
    return <BaseComponent key={key} {...passedProps} />;
  }

  return observer(WrapperComponent);
};

export default withSiteIdUpdater;
