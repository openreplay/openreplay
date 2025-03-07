import cn from 'classnames';
import { Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useState, useCallback, useMemo } from 'react';

import { durationFormatted, formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import {
  assist as assistRoute,
  isRoute,
  liveSession,
  sessions as sessionsRoute
} from 'App/routes';
import { capitalize } from 'App/utils';
import { Avatar, CountryFlag, Icon, Label, TextEllipsis } from 'UI';
import { useLocation } from "react-router";
import Counter from './Counter';
import ErrorBars from './ErrorBars';
import PlayLink from './PlayLink';
import SessionMetaList from './SessionMetaList';
import stl from './sessionItem.module.css';
import { Tooltip } from 'antd';

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
    userCity: string;
    userState: string;
    startedAt: number;
    duration: Duration;
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
    issueTypes: [];
    active: boolean;
    isCallActive?: boolean;
    agentIds?: string[];
    timezone: string;
    platform: string;
  };
  onUserClick?: (userId: string, userAnonymousId: string) => void;
  hasUserFilter?: boolean;
  disableUser?: boolean;
  metaList?: Array<any>;
  lastPlayedSessionId?: string;
  live?: boolean;
  onClick?: any;
  compact?: boolean;
  isDisabled?: boolean;
  isAdd?: boolean;
  ignoreAssist?: boolean;
  bookmarked?: boolean;
  toggleFavorite?: (sessionId: string) => void;
  query?: string;
}

const PREFETCH_STATE = {
  none: 0,
  loading: 1,
  fetched: 2
};

function SessionItem(props: Props) {
  const location = useLocation();
  const { settingsStore, sessionStore } = useStore();
  const { timezone, shownTimezone } = settingsStore.sessionSettings;
  const [prefetchState, setPrefetched] = useState(PREFETCH_STATE.none);

  // Destructure all props at the top
  const {
    session,
    onUserClick = () => null,
    hasUserFilter = false,
    disableUser = false,
    metaList = [],
    lastPlayedSessionId,
    onClick = null,
    compact = false,
    ignoreAssist = false,
    bookmarked = false,
    query,
    // location,
    isDisabled,
    live: propsLive,
    isAdd
  } = props;

  const {
    sessionId,
    userBrowser,
    userOs,
    userId,
    userAnonymousId,
    userDisplayName,
    userCountry,
    userCity,
    userState,
    startedAt,
    duration,
    eventsCount,
    viewed,
    userDeviceType,
    userNumericHash,
    live: sessionLive,
    metadata,
    issueTypes,
    active,
    platform,
    timezone: userTimezone,
    isCallActive,
    agentIds
  } = session;

  // Memoize derived values
  const queryParams = useMemo(
    () => Object.fromEntries(new URLSearchParams(location.search)),
    [location.search]
  );

  const isMobile = platform !== 'web';
  const formattedDuration = useMemo(() => durationFormatted(duration), [duration]);
  const hasUserId = userId || userAnonymousId;

  const isSessions = useMemo(
    () => isRoute(SESSIONS_ROUTE, location.pathname),
    [location.pathname]
  );

  const isAssist = useMemo(() => {
    return (
      (!ignoreAssist &&
        (isRoute(ASSIST_ROUTE, location.pathname) ||
          isRoute(ASSIST_LIVE_SESSION, location.pathname) ||
          location.pathname.includes('multiview'))) ||
      propsLive
    );
  }, [ignoreAssist, location.pathname, propsLive]);

  const isLastPlayed = lastPlayedSessionId === sessionId;
  const live = sessionLive || propsLive;
  const isMultiviewDisabled = isDisabled && location.pathname.includes('multiview');

  // Memoize metadata list creation
  const _metaList = useMemo(() => {
    return Object.keys(metadata).map((key) => ({
      label: key,
      value: metadata[key]
    }));
  }, [metadata]);

  // Memoize event handlers
  const handleHover = useCallback(async () => {
    if (prefetchState !== PREFETCH_STATE.none || live || isAssist || isMobile)
      return;

    setPrefetched(PREFETCH_STATE.loading);
    try {
      await sessionStore.getFirstMob(sessionId);
      setPrefetched(PREFETCH_STATE.fetched);
    } catch (e) {
      console.error('Error while prefetching first mob', e);
    }
  }, [prefetchState, live, isAssist, isMobile, sessionStore, sessionId]);

  const populateData = useCallback(() => {
    if (live || isAssist || prefetchState === PREFETCH_STATE.none || isMobile) {
      return;
    }
    sessionStore.prefetchSession(session);
  }, [live, isAssist, prefetchState, isMobile, sessionStore, session]);

  const handleUserClick = useCallback(() => {
    if (!disableUser && !hasUserFilter && hasUserId) {
      onUserClick(userId, userAnonymousId);
    }
  }, [disableUser, hasUserFilter, hasUserId, onUserClick, userId, userAnonymousId]);

  const handleAddClick = useCallback(() => {
    if (!isDisabled && onClick) {
      onClick();
    }
  }, [isDisabled, onClick]);

  // Memoize time formatting
  const formattedTime = useMemo(() => {
    const timezoneToUse =
      shownTimezone === 'user' && userTimezone
        ? {
          label: userTimezone.split('+').join(' +'),
          value: userTimezone.split(':')[0]
        }
        : timezone;

    return formatTimeOrDate(startedAt, timezoneToUse);
  }, [startedAt, shownTimezone, userTimezone, timezone]);

  // Memoize tooltip content
  const timeTooltipContent = useMemo(() => {
    return (
      <div className={'flex flex-col gap-1'}>
        <span>
          Local Time: {formatTimeOrDate(startedAt, timezone, true)}{' '}
          {timezone.label}
        </span>
        {userTimezone ? (
          <span>
            User's Time:{' '}
            {formatTimeOrDate(
              startedAt,
              {
                label: userTimezone.split('+').join(' +'),
                value: userTimezone.split(':')[0]
              },
              true
            )}{' '}
            {userTimezone}
          </span>
        ) : null}
      </div>
    );
  }, [startedAt, timezone, userTimezone]);

  return (
    <Tooltip
      title={!isMultiviewDisabled ? '' : `Session already added into the multiview`}
    >
      <div
        className={cn(stl.sessionItem, 'flex flex-col p-4')}
        id="session-item"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleHover}
      >
        <div className="flex items-start">
          <div className={cn('flex items-center w-full')}>
            {!compact && (
              <div
                className={'flex flex-col shrink-0 pr-2 gap-2'}
                style={{ width: '40%' }}
              >
                <div className="flex items-center pr-2 shrink-0">
                  <div>
                    <Avatar
                      width={'24px'}
                      height={'24px'}
                      iconSize={12}
                      isActive={active}
                      seed={userNumericHash}
                      isAssist={isAssist}
                    />
                  </div>
                  <div className="overflow-hidden color-gray-medium ml-3 justify-between items-center shrink-0">
                    <div
                      className={cn('text-lg', {
                        'color-teal cursor-pointer':
                          !disableUser && hasUserId && !isDisabled,
                        [stl.userName]:
                        !disableUser && hasUserId && !isDisabled,
                        'color-gray-medium': disableUser || !hasUserId
                      })}
                      onClick={handleUserClick}
                    >
                      <TextEllipsis
                        text={userDisplayName}
                        maxWidth="200px"
                        popupProps={{ inverted: true, size: 'tiny' }}
                      />
                    </div>
                  </div>
                </div>
                {_metaList.length > 0 && (
                  <SessionMetaList metaList={_metaList} />
                )}
              </div>
            )}
            <div
              style={{ width: compact ? '40%' : '20%' }}
              className="px-2 flex flex-col justify-between"
            >
              <div>
                <Tooltip
                  // delay={0}
                  // disabled={isDisabled}
                  title={isDisabled ? '' : timeTooltipContent}
                  className="w-fit !block"
                >
                  <TextEllipsis
                    text={formattedTime}
                    popupProps={{ inverted: true, size: 'tiny' }}
                  />
                </Tooltip>
              </div>
              <div className="flex items-center color-gray-medium py-1">
                {!isAssist && (
                  <>
                    <div className="color-gray-medium">
                      <span className="mr-1">{eventsCount}</span>
                      <span>
                        {eventsCount === 0 || eventsCount > 1
                          ? 'Events'
                          : 'Event'}
                      </span>
                    </div>
                    <Icon name="circle-fill" size={3} className="mx-4" />
                  </>
                )}
                <div>
                  {live ? (
                    <Counter startTime={startedAt} />
                  ) : (
                    formattedDuration
                  )}
                </div>
              </div>
            </div>
            <div
              style={{ width: '30%' }}
              className="px-2 flex flex-col justify-between"
            >
              <div style={{ height: '21px' }}>
                <CountryFlag
                  userCity={userCity}
                  userState={userState}
                  country={userCountry}
                  showLabel={true}
                />
              </div>
              <div className="color-gray-medium flex items-center py-1">
                {userBrowser && (
                  <span className="capitalize" style={{ maxWidth: '70px' }}>
                    <TextEllipsis
                      text={capitalize(userBrowser)}
                      popupProps={{ inverted: true, size: 'tiny' }}
                    />
                  </span>
                )}
                {userOs && userBrowser && (
                  <Icon name="circle-fill" size={3} className="mx-4" />
                )}
                {userOs && (
                  <span
                    className={/ios/i.test(userOs) ? '' : 'capitalize'}
                    style={{ maxWidth: '70px' }}
                  >
                    <TextEllipsis
                      text={/ios/i.test(userOs) ? 'iOS' : capitalize(userOs)}
                      popupProps={{ inverted: true, size: 'tiny' }}
                    />
                  </span>
                )}
                {userOs && (
                  <Icon name="circle-fill" size={3} className="mx-4" />
                )}
                <span className="capitalize" style={{ maxWidth: '70px' }}>
                  <TextEllipsis
                    text={capitalize(userDeviceType)}
                    popupProps={{ inverted: true, size: 'tiny' }}
                  />
                </span>
              </div>
            </div>
            {isSessions && (
              <div
                style={{ width: '10%' }}
                className="self-center px-2 flex items-center"
              >
                <ErrorBars count={issueTypes.length} />
              </div>
            )}
          </div>

          <div className="flex items-center m-auto">
            <div
              className={cn(
                stl.playLink,
                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
              )}
              id="play-button"
              data-viewed={viewed}
            >
              {live && isCallActive && agentIds && agentIds.length > 0 && (
                <div className="mr-4">
                  <Label className="bg-gray-lightest p-1 px-2 rounded-lg">
                    <span
                      className="color-gray-medium text-xs"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      CALL IN PROGRESS
                    </span>
                  </Label>
                </div>
              )}
              {isSessions && (
                <div className="mr-4 flex-shrink-0 w-24">
                  {isLastPlayed && (
                    <Label className="bg-gray-lightest p-1 px-2 rounded-lg">
                      <span
                        className="color-gray-medium text-xs"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        LAST PLAYED
                      </span>
                    </Label>
                  )}
                </div>
              )}
              {isAdd ? (
                <div
                  className="rounded-full border-tealx p-2 border"
                  onClick={handleAddClick}
                >
                  <div className="bg-tealx rounded-full p-2">
                    <Icon name="plus" size={16} color="white" />
                  </div>
                </div>
              ) : (
                <PlayLink
                  isAssist={isAssist}
                  sessionId={sessionId}
                  viewed={viewed}
                  onClick={onClick}
                  queryParams={queryParams}
                  query={query}
                  beforeOpen={live || isAssist ? undefined : populateData}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

export default observer(SessionItem);
