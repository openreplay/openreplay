import React, { useEffect } from 'react';
import cn from 'classnames';
import { CountryFlag, Avatar, TextEllipsis, Label, Icon } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { durationFormatted, formatTimeOrDate } from 'App/date';
import stl from './sessionItem.module.css';
import Counter from './Counter';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import SessionMetaList from './SessionMetaList';
import PlayLink from './PlayLink';
import ErrorBars from './ErrorBars';
import { assist as assistRoute, liveSession, sessions as sessionsRoute, isRoute } from 'App/routes';
import { capitalize } from 'App/utils';
import { Tooltip } from 'react-tippy';

const ASSIST_ROUTE = assistRoute();
const ASSIST_LIVE_SESSION = liveSession();
const SESSIONS_ROUTE = sessionsRoute();

interface Props {
    session: {
        sessionId: string;
        userBrowser: string;
        userOs: string;
        userId: string;
        userAnonymousId: string;
        userDisplayName: string;
        userCountry: string;
        startedAt: number;
        duration: string;
        eventsCount: number;
        errorsCount: number;
        pagesCount: number;
        viewed: boolean;
        favorite: boolean;
        userDeviceType: string;
        userUuid: string;
        userNumericHash: number;
        live: boolean;
        metadata: Record<string, any>;
        userSessionsCount: number;
        issueTypes: [];
        active: boolean;
        isCallActive?: boolean;
        agentIds?: string[];
    };
    onUserClick?: (userId: string, userAnonymousId: string) => void;
    hasUserFilter?: boolean;
    disableUser?: boolean;
    metaList?: Array<any>;
    // showActive?: boolean;
    lastPlayedSessionId?: string;
    live?: boolean;
    onClick?: any;
    compact?: boolean;
}

function SessionItem(props: RouteComponentProps & Props) {
    const { settingsStore } = useStore();
    const { timezone } = settingsStore.sessionSettings;

    const {
        session,
        onUserClick = () => null,
        hasUserFilter = false,
        disableUser = false,
        metaList = [],
        lastPlayedSessionId,
        onClick = null,
        compact = false,
    } = props;

    const {
        sessionId,
        userBrowser,
        userOs,
        userId,
        userAnonymousId,
        userDisplayName,
        userCountry,
        startedAt,
        duration,
        eventsCount,
        viewed,
        userDeviceType,
        userNumericHash,
        live,
        metadata,
        issueTypes,
        active,
    } = session;

    const location = props.location;
    const queryParams = Object.fromEntries(new URLSearchParams(location.search));

    const formattedDuration = durationFormatted(duration);
    const hasUserId = userId || userAnonymousId;
    const isSessions = isRoute(SESSIONS_ROUTE, location.pathname);
    const isAssist = isRoute(ASSIST_ROUTE, location.pathname) || isRoute(ASSIST_LIVE_SESSION, location.pathname);
    const isLastPlayed = lastPlayedSessionId === sessionId;

    const _metaList = Object.keys(metadata)
        .filter((i) => metaList.includes(i))
        .map((key) => {
            const value = metadata[key];
            return { label: key, value };
        });

    return (
        <div className={cn(stl.sessionItem, 'flex flex-col py-2 px-4')} id="session-item" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start">
                <div className={cn('flex items-center w-full')}>
                    {!compact && (
                        <div className="flex items-center pr-2 shrink-0" style={{ width: '40%' }}>
                            <div>
                                <Avatar isActive={active} seed={userNumericHash} isAssist={isAssist} />
                            </div>
                            <div className="flex flex-col overflow-hidden color-gray-medium ml-3 justify-between items-center shrink-0">
                                <div
                                    className={cn('text-lg', {
                                        'color-teal cursor-pointer': !disableUser && hasUserId,
                                        [stl.userName]: !disableUser && hasUserId,
                                        'color-gray-medium': disableUser || !hasUserId,
                                    })}
                                    onClick={() => !disableUser && !hasUserFilter && hasUserId ? onUserClick(userId, userAnonymousId) : null}
                                >
                                    <TextEllipsis text={userDisplayName} maxWidth="200px" popupProps={{ inverted: true, size: 'tiny' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div style={{ width: compact ? '40%' : '20%' }} className="px-2 flex flex-col justify-between">
                        <div>
                            {/* @ts-ignore */}
                            <Tooltip
                                title={`${formatTimeOrDate(startedAt, timezone, true)} ${timezone.label}`}
                                className="w-fit !block"
                            >
                                <TextEllipsis text={formatTimeOrDate(startedAt, timezone)} popupProps={{ inverted: true, size: 'tiny' }} />
                            </Tooltip>
                        </div>
                        <div className="flex items-center color-gray-medium py-1">
                            {!isAssist && (
                                <>
                                    <div className="color-gray-medium">
                                        <span className="mr-1">{eventsCount}</span>
                                        <span>{eventsCount === 0 || eventsCount > 1 ? 'Events' : 'Event'}</span>
                                    </div>
                                    <Icon name="circle-fill" size={3} className="mx-4" />
                                </>
                            )}
                            <div>{live ? <Counter startTime={startedAt} /> : formattedDuration}</div>
                        </div>
                    </div>
                    <div style={{ width: '30%' }} className="px-2 flex flex-col justify-between">
                        <div style={{ height: '21px' }}>
                            <CountryFlag country={userCountry} style={{ paddingTop: '4px' }} label />
                        </div>
                        <div className="color-gray-medium flex items-center py-1">
                            <span className="capitalize" style={{ maxWidth: '70px' }}>
                                <TextEllipsis text={capitalize(userBrowser)} popupProps={{ inverted: true, size: 'tiny' }} />
                            </span>
                            <Icon name="circle-fill" size={3} className="mx-4" />
                            <span className="capitalize" style={{ maxWidth: '70px' }}>
                                <TextEllipsis text={capitalize(userOs)} popupProps={{ inverted: true, size: 'tiny' }} />
                            </span>
                            <Icon name="circle-fill" size={3} className="mx-4" />
                            <span className="capitalize" style={{ maxWidth: '70px' }}>
                                <TextEllipsis text={capitalize(userDeviceType)} popupProps={{ inverted: true, size: 'tiny' }} />
                            </span>
                        </div>
                    </div>
                    {isSessions && (
                        <div style={{ width: '10%' }} className="self-center px-2 flex items-center">
                            <ErrorBars count={issueTypes.length} />
                        </div>
                    )}
                </div>

                <div className="flex items-center">
                    <div className={stl.playLink} id="play-button" data-viewed={viewed}>
                        {live && session.isCallActive && session.agentIds.length > 0 ? (
                            <div className="mr-4">
                                <Label className="bg-gray-lightest p-1 px-2 rounded-lg">
                                    <span className="color-gray-medium text-xs" style={{ whiteSpace: 'nowrap' }}>
                                        CALL IN PROGRESS
                                    </span>
                                </Label>
                            </div>
                        ) : null}
                        {isSessions && (
                            <div className="mr-4 flex-shrink-0 w-24">
                                {isLastPlayed && (
                                    <Label className="bg-gray-lightest p-1 px-2 rounded-lg">
                                        <span className="color-gray-medium text-xs" style={{ whiteSpace: 'nowrap' }}>
                                            LAST PLAYED
                                        </span>
                                    </Label>
                                )}
                            </div>
                        )}
                        <PlayLink isAssist={isAssist} sessionId={sessionId} viewed={viewed} onClick={onClick} queryParams={queryParams} />
                    </div>
                </div>
            </div>
            {_metaList.length > 0 && <SessionMetaList className="mt-4" metaList={_metaList} />}
        </div>
    );
}

export default withRouter(observer(SessionItem));
