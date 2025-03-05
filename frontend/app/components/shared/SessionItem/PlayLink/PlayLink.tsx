import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';

import {
  liveSession as liveSessionRoute,
  session as sessionRoute,
  withSiteId,
} from 'App/routes';
import { Icon, Link } from 'UI';
import { useStore } from 'App/mstore';

const PLAY_ICON_NAMES = {
  notPlayed: 'play-fill',
  played: 'play-circle-light',
} as const;

const getIconName = (isViewed: any) =>
  !isViewed ? PLAY_ICON_NAMES.notPlayed : PLAY_ICON_NAMES.played;

interface Props {
  isAssist?: boolean;
  viewed: boolean;
  sessionId: string;
  onClick?: () => void;
  queryParams?: any;
  newTab?: boolean;
  query?: string;
  beforeOpen?: () => void;
  siteId?: string;
}
function PlayLink(props: Props) {
  const { projectsStore } = useStore();
  const { isAssist, viewed, sessionId, onClick = null, queryParams } = props;
  const history = useHistory();
  const defaultIconName = getIconName(viewed);

  const [iconName, setIconName] =
    useState<(typeof PLAY_ICON_NAMES)[keyof typeof PLAY_ICON_NAMES]>(
      defaultIconName,
    );

  useEffect(() => {
    setIconName(getIconName(viewed));
  }, [viewed]);

  const link = isAssist
    ? liveSessionRoute(sessionId, queryParams)
    : sessionRoute(sessionId);

  const handleBeforeOpen = (e: any) => {
    const projectId = props.siteId ?? projectsStore.getSiteId().siteId!;
    const replayLink = withSiteId(
      link + (props.query ? props.query : ''),
      projectId,
    );
    if (props.beforeOpen) {
      // check for ctrl or shift
      if (e.ctrlKey || e.shiftKey || e.metaKey) {
        e.preventDefault();
        return window.open(replayLink, '_blank');
      }
      e.preventDefault();
      props.beforeOpen();
      history.push(replayLink);
    }
  };

  const onLinkClick = props.beforeOpen ? handleBeforeOpen : onClick;

  return (
    <Link
      className="group"
      onClick={onLinkClick}
      to={link + (props.query ? props.query : '')}
      target={props.newTab ? '_blank' : undefined}
      rel={props.newTab ? 'noopener noreferrer' : undefined}
    >
      <div className="group-hover:block hidden">
        <Icon name="play-hover" size={38} color={isAssist ? 'tealx' : 'teal'} />
      </div>
      <div className="group-hover:hidden block">
        <Icon name={iconName} size={38} color={isAssist ? 'tealx' : 'teal'} />
      </div>
    </Link>
  );
}

export default PlayLink;
