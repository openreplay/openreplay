import React, { useState, useEffect } from 'react'
import { 
    Link,
    Icon,
  } from 'UI';
import { session as sessionRoute, liveSession as liveSessionRoute } from 'App/routes';

const PLAY_ICON_NAMES = {
    notPlayed: 'play-fill',
    played: 'play-circle-light',
    hovered: 'play-hover'
}

const getDefaultIconName = (isViewed) => !isViewed ? PLAY_ICON_NAMES.notPlayed : PLAY_ICON_NAMES.played

interface Props {
    isAssist: boolean;
    viewed: boolean;
    sessionId: string;
}
export default function PlayLink(props: Props) {
    const { isAssist, viewed, sessionId } = props
    const defaultIconName = getDefaultIconName(viewed)

    const [isHovered, toggleHover] = useState(false)
    const [iconName, setIconName] = useState(defaultIconName)

    useEffect(() => {
        if (isHovered) setIconName(PLAY_ICON_NAMES.hovered)
        else setIconName(getDefaultIconName(viewed))
    }, [isHovered, viewed])

    return (
        <Link 
            to={ isAssist ? liveSessionRoute(sessionId) : sessionRoute(sessionId) }
            onMouseEnter={() => toggleHover(true)}
            onMouseLeave={() => toggleHover(false)}
        >
            <Icon name={iconName} size="42" color={isAssist ? "tealx" : "teal"} />
        </Link>
    )
}