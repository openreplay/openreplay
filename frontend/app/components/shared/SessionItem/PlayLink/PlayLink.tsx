import React, { useState, useEffect } from 'react';
import { Link, Icon } from 'UI';

const PLAY_ICON_NAMES = {
  notPlayed: 'play-fill',
  played: 'play-circle-light',
  hovered: 'play-hover',
};

const getDefaultIconName = (isViewed: any) =>
  !isViewed ? PLAY_ICON_NAMES.notPlayed : PLAY_ICON_NAMES.played;

interface Props {
  sessionLink: string;
  viewed: boolean;
  onClick?: () => void;
  newTab?: boolean;
}
export default function PlayLink(props: Props) {
  const { viewed, sessionLink, onClick = null } = props;
  const defaultIconName = getDefaultIconName(viewed);

  const [isHovered, toggleHover] = useState(false);
  const [iconName, setIconName] = useState(defaultIconName);

  useEffect(() => {
    if (isHovered) setIconName(PLAY_ICON_NAMES.hovered);
    else setIconName(getDefaultIconName(viewed));
  }, [isHovered, viewed]);

  return (
    <Link
      onClick={onClick ? onClick : () => {}}
      to={sessionLink}
      onMouseEnter={() => toggleHover(true)}
      onMouseLeave={() => toggleHover(false)}
      target={props.newTab ? '_blank' : undefined}
      rel={props.newTab ? 'noopener noreferrer' : undefined}
    >
      <Icon name={iconName} size={38} color={'teal'} />
    </Link>
  );
}
