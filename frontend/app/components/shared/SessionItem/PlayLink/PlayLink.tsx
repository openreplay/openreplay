import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';

import {
  liveSession as liveSessionRoute,
  session as sessionRoute,
  withSiteId,
} from 'App/routes';
import { Icon, Link } from 'UI';
import { connect } from 'react-redux';

const PLAY_ICON_NAMES = {
  notPlayed: 'play-fill',
  played: 'play-circle-light',
  hovered: 'play-hover',
};

const getDefaultIconName = (isViewed: any) =>
  !isViewed ? PLAY_ICON_NAMES.notPlayed : PLAY_ICON_NAMES.played;

interface Props {
  isAssist: boolean;
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
  const { isAssist, viewed, sessionId, onClick = null, queryParams } = props;
  const history = useHistory();
  const defaultIconName = getDefaultIconName(viewed);

  const [isHovered, toggleHover] = useState(false);
  const [iconName, setIconName] = useState(defaultIconName);

  useEffect(() => {
    if (isHovered) setIconName(PLAY_ICON_NAMES.hovered);
    else setIconName(getDefaultIconName(viewed));
  }, [isHovered, viewed]);

  const link = isAssist
    ? liveSessionRoute(sessionId, queryParams)
    : sessionRoute(sessionId);

  const handleBeforeOpen = () => {
    if (props.beforeOpen) {
      props.beforeOpen();
      history.push(withSiteId(link + (props.query ? props.query : ''), props.siteId));
    }
  };

  const onLinkClick = props.beforeOpen ? handleBeforeOpen : onClick;
  return (
    <Link
      onClick={onLinkClick}
      to={link + (props.query ? props.query : '')}
      onMouseEnter={() => toggleHover(true)}
      onMouseLeave={() => toggleHover(false)}
      target={props.newTab ? '_blank' : undefined}
      rel={props.newTab ? 'noopener noreferrer' : undefined}
    >
      <Icon name={iconName} size={38} color={isAssist ? 'tealx' : 'teal'} />
    </Link>
  );
}


export default connect((state: any, props: Props) => ({
    siteId: props.siteId || state.getIn([ 'site', 'siteId' ])
}))(PlayLink);