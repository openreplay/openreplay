import React from 'react';
import { withRouter } from 'react-router-dom';
import { withSiteId } from 'App/routes';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

export default (BaseComponent) =>
  withRouter(
    observer((props) => {
      const { history, ...other } = props;
      const { projectsStore } = useStore();
      const { siteId } = projectsStore;

      const push = (location) => {
        if (typeof location === 'string') {
          history.push(withSiteId(location, siteId));
        } else if (typeof location === 'object') {
          history.push({
            ...location,
            pathname: withSiteId(location.pathname, siteId),
          });
        }
      };

      return <BaseComponent {...other} history={{ ...history, push }} />;
    }),
  );
