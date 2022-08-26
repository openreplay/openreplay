import React, { useState } from 'react';
import { connect } from 'react-redux';
import { List } from 'immutable';
import { countries } from 'App/constants';
import { useStore } from 'App/mstore';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import { formatTimeOrDate } from 'App/date';
import { Avatar, TextEllipsis, CountryFlag, Icon } from 'UI';
import cn from 'classnames';
import { withRequest } from 'HOCs';
import SessionInfoItem from '../../SessionInfoItem';
import { Tooltip } from 'react-tippy';
import { useModal } from 'App/components/Modal';
import UserSessionsModal from 'Shared/UserSessionsModal';

function UserCard({ className, request, session, width, height, similarSessions, loading }) {
    const { settingsStore } = useStore();
    const { timezone } = settingsStore.sessionSettings;

    const {
        userBrowser,
        userDevice,
        userCountry,
        userBrowserVersion,
        userOs,
        userOsVersion,
        startedAt,
        userId,
        userAnonymousId,
        userNumericHash,
        userDisplayName,
        userDeviceType,
        revId,
    } = session;

    const hasUserDetails = !!userId || !!userAnonymousId;

    const getDimension = (width, height) => {
        return width && height ? (
            <div className="flex items-center">
                {width || 'x'} <Icon name="close" size="12" className="mx-1" /> {height || 'x'}
            </div>
        ) : (
            <span className="">Resolution N/A</span>
        );
    };

    const avatarbgSize = '38px';
    return (
        <div className={cn('bg-white flex items-center w-full', className)}>
            <div className="flex items-center">
                <Avatar iconSize="23" width={avatarbgSize} height={avatarbgSize} seed={userNumericHash} />
                <div className="ml-3 overflow-hidden leading-tight">
                    <TextEllipsis
                        noHint
                        className={cn('font-medium', { 'color-teal cursor-pointer': hasUserDetails })}
                        // onClick={hasUserDetails ? showSimilarSessions : undefined}
                    >
                        <UserName name={userDisplayName} userId={userId} hash={userNumericHash} />
                    </TextEllipsis>

                    <div className="text-sm color-gray-medium flex items-center">
                        <span style={{ whiteSpace: 'nowrap' }}>
                        <Tooltip
                            title={`${formatTimeOrDate(startedAt, timezone, true)} ${timezone.label}`}
                            className="w-fit !block"
                        >
                            {formatTimeOrDate(startedAt, timezone)}
                        </Tooltip>

                        </span>
                        <span className="mx-1 font-bold text-xl">&#183;</span>
                        <span>{countries[userCountry]}</span>
                        <span className="mx-1 font-bold text-xl">&#183;</span>
                        <span className="capitalize">
                            {userBrowser}, {userOs}, {userDevice}
                        </span>
                        <span className="mx-1 font-bold text-xl">&#183;</span>
                        <Tooltip
                            theme="light"
                            delay={0}
                            hideOnClick="persistent"
                            arrow
                            interactive
                            html={
                                <div className="text-left">
                                    <SessionInfoItem
                                        comp={<CountryFlag country={userCountry} />}
                                        label={countries[userCountry]}
                                        value={<span style={{ whiteSpace: 'nowrap' }}>{formatTimeOrDate(startedAt)}</span>}
                                    />
                                    <SessionInfoItem icon={browserIcon(userBrowser)} label={userBrowser} value={`v${userBrowserVersion}`} />
                                    <SessionInfoItem icon={osIcon(userOs)} label={userOs} value={userOsVersion} />
                                    <SessionInfoItem
                                        icon={deviceTypeIcon(userDeviceType)}
                                        label={userDeviceType}
                                        value={getDimension(width, height)}
                                        isLast={!revId}
                                    />
                                    {revId && <SessionInfoItem icon="info" label="Rev ID:" value={revId} isLast />}
                                </div>
                            }
                            position="bottom center"
                            hoverable
                            disabled={false}
                            on="hover"
                        >
                            <span className="color-teal cursor-pointer">More</span>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* <SlideModal
        title={ <div>User Sessions</div> }
        isDisplayed={ showUserSessions }
        content={ showUserSessions && <SessionList similarSessions={ similarSessions } loading={ loading } /> }
        onClose={ () => showUserSessions ? setShowUserSessions(false) : null }
      /> */}
        </div>
    );
}

const component = React.memo(connect((state) => ({ session: state.getIn(['sessions', 'current']) }))(UserCard));

export default withRequest({
    initialData: List(),
    endpoint: '/metadata/session_search',
    dataWrapper: (data) => Object.values(data),
    dataName: 'similarSessions',
})(component);

// inner component
function UserName({ name, userId, hash }) {
    const { showModal } = useModal();
    const onClick = () => {
        showModal(<UserSessionsModal userId={userId} hash={hash} name={name} />, { right: true });
    };
    return <div onClick={userId ? onClick : () => {}}>{name}</div>;
}
