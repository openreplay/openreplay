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
  hovered: 'play-hover',
} as const

const getDefaultIconName = (isViewed: any) =>
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
  const defaultIconName = getDefaultIconName(viewed);

  const [isHovered, toggleHover] = useState(false);
  const [iconName, setIconName] = useState<typeof PLAY_ICON_NAMES[keyof typeof PLAY_ICON_NAMES]>(defaultIconName);

  useEffect(() => {
    if (isHovered) setIconName(PLAY_ICON_NAMES.hovered);
    else setIconName(getDefaultIconName(viewed));
  }, [isHovered, viewed]);

  const link = isAssist
    ? liveSessionRoute(sessionId, queryParams)
    : sessionRoute(sessionId);

  const handleBeforeOpen = (e: any) => {
    const projectId = props.siteId ?? projectsStore.getSiteId().siteId!;
    const replayLink = withSiteId(
      link + (props.query ? props.query : ''),
      projectId
    );
    if (props.beforeOpen) {
      // check for ctrl or shift
      if (e.ctrlKey || e.shiftKey || e.metaKey) {
        e.preventDefault();
        return window.open(replayLink, '_blank');
      } else {
        e.preventDefault();
        props.beforeOpen();
        history.push(replayLink);
      }
    }
  };

  const onLinkClick = props.beforeOpen ? handleBeforeOpen : onClick;

  const onLeave = () => {
    toggleHover(false);
  };
  const onOver = () => {
    toggleHover(true);
  };
  return (
    <Link
      onClick={onLinkClick}
      to={link + (props.query ? props.query : '')}
      onMouseOver={onOver}
      onMouseOut={onLeave}
      target={props.newTab ? '_blank' : undefined}
      rel={props.newTab ? 'noopener noreferrer' : undefined}
    >
      <Icon name={iconName} size={38} color={isAssist ? 'tealx' : 'teal'} />
    </Link>
  );
}

export default PlayLink
