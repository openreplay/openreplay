import React, { useState, useEffect } from 'react';
import { Link, Icon } from 'UI';
import { session as sessionRoute, liveSession as liveSessionRoute } from 'App/routes';

const PLAY_ICON_NAMES = {
    notPlayed: 'play-fill',
    played: 'play-circle-light',
    hovered: 'play-hover',
};

const getDefaultIconName = (isViewed: any) => (!isViewed ? PLAY_ICON_NAMES.notPlayed : PLAY_ICON_NAMES.played);

interface Props {
    isAssist: boolean;
    viewed: boolean;
    sessionId: string;
    onClick?: () => void;
    queryParams?: any;
}
export default function PlayLink(props: Props) {
    const { isAssist, viewed, sessionId, onClick = null, queryParams } = props;
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
            to={isAssist ? liveSessionRoute(sessionId, queryParams) : sessionRoute(sessionId)}
            onMouseEnter={() => toggleHover(true)}
            onMouseLeave={() => toggleHover(false)}
        >
            <Icon name={iconName} size={38} color={isAssist ? 'tealx' : 'teal'} />
        </Link>
    );
}
