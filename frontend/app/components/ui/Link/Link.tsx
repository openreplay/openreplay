import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { withSiteId } from 'App/routes';
import { Link } from 'App/routing';

import styles from './link.module.css';

interface Props {
  to: string;
  className?: string;
  siteId?: string;
  dispatch?: any;
  [key: string]: any;
}

function OpenReplayLink({
  siteId,
  to,
  className = '',
  dispatch,
  ...other
}: Props) {
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
