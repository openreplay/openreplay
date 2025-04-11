import React from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import cn from 'classnames';
import { withSiteId } from 'App/routes';
import styles from './link.module.css';

function OpenReplayLink({ siteId, to, className = '', dispatch, ...other }) {
  const { projectsStore } = useStore();
  const projectId = projectsStore.siteId;
  return (
    <Link
      {...other}
      className={cn(className, styles.link, 'px-2', 'hover:text-inherit')}
      to={withSiteId(to, siteId ?? projectId)}
    />
  );
}

OpenReplayLink.displayName = 'OpenReplayLink';

export default OpenReplayLink;
