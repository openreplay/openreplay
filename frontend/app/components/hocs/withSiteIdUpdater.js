import React, { useEffect, useRef } from 'react';
import { useStore } from "App/mstore";
import { observer } from 'mobx-react-lite'
import { useParams, useNavigate } from 'react-router';

const withSiteIdUpdater = (BaseComponent) => {
  const WrapperComponent = (props) => {
    const { siteId: urlSiteId } = useParams();
    const navigate = useNavigate();
    const { projectsStore } = useStore();
    const siteId = projectsStore.siteId;
    const setSiteId = projectsStore.setSiteId;
    const prevSiteIdRef = useRef(siteId);

    useEffect(() => {
      if (urlSiteId && urlSiteId !== siteId) {
        setSiteId(urlSiteId);
      }
    }, []);

    useEffect(() => {
      const pathname = location.pathname;

      const shouldUrlUpdate = urlSiteId && parseInt(urlSiteId, 10) !== parseInt(siteId, 10);
      if (shouldUrlUpdate) {
        const path = ['', siteId].concat(pathname.split('/').slice(2)).join('/');
        navigate(path);
      }
      prevSiteIdRef.current = siteId;
    }, [urlSiteId, siteId, location.pathname]);

    const key = siteId;

    const passedProps = { ...props, siteId, setSiteId, urlSiteId };
    return <BaseComponent key={key} {...passedProps} />;
  };

  return observer(WrapperComponent);
};

export default withSiteIdUpdater;
