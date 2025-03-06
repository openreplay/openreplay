import React from 'react';
import { countries } from 'App/constants';
import { useStore } from 'App/mstore';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import { formatTimeOrDate } from 'App/date';
import { Avatar, TextEllipsis, CountryFlag, Icon, Tooltip, Popover } from 'UI';
import cn from 'classnames';
import { useModal } from 'App/components/Modal';
import UserSessionsModal from 'Shared/UserSessionsModal';
import { observer } from 'mobx-react-lite';
import SessionInfoItem from '../../SessionInfoItem';
import { useTranslation } from 'react-i18next';

function UserCard({ className, width, height }) {
  const { t } = useTranslation();
  const { settingsStore, sessionStore } = useStore();
  const session = sessionStore.current;
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

  const getDimension = (width, height) =>
    width && height ? (
      <div className="flex items-center">
        {width || 'x'} <Icon name="close" size="12" className="mx-1" />{' '}
        {height || 'x'}
      </div>
    ) : (
      <span className="">{t('Resolution N/A')}</span>
    );

  const avatarbgSize = '38px';
  return (
    <div className={cn('bg-white flex items-center w-full', className)}>
      <div className="flex items-center">
        <Avatar
          iconSize="23"
          width={avatarbgSize}
          height={avatarbgSize}
          seed={userNumericHash}
        />
        <div className="ml-3 overflow-hidden leading-tight">
          <TextEllipsis
            noHint
            className={cn('font-medium', {
              'color-teal cursor-pointer': hasUserDetails,
            })}
          >
            <UserName
              name={userDisplayName}
              userId={userId}
              hash={userNumericHash}
            />
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
              {userBrowser},{userOs},{userDevice}
            </span>
            <span className="mx-1 font-bold text-xl">&#183;</span>
            <Popover
              render={() => (
                <div className="text-left bg-white">
                  <SessionInfoItem
                    comp={<CountryFlag country={userCountry} />}
                    label={countries[userCountry]}
                    value={
                      <span style={{ whiteSpace: 'nowrap' }}>
                        {formatTimeOrDate(startedAt)}
                      </span>
                    }
                  />
                  <SessionInfoItem
                    icon={browserIcon(userBrowser)}
                    label={userBrowser}
                    value={`v${userBrowserVersion}`}
                  />
                  <SessionInfoItem
                    icon={osIcon(userOs)}
                    label={userOs}
                    value={userOsVersion}
                  />
                  <SessionInfoItem
                    icon={deviceTypeIcon(userDeviceType)}
                    label={userDeviceType}
                    value={getDimension(width, height)}
                    isLast={!revId}
                  />
                  {revId && (
                    <SessionInfoItem
                      icon="info"
                      label="Rev ID:"
                      value={revId}
                      isLast
                    />
                  )}
                </div>
              )}
            >
              <span className="link">{t('More')}</span>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

export default observer(UserCard);

// inner component
function UserName({ name, userId, hash }) {
  const { showModal } = useModal();
  const onClick = () => {
    showModal(<UserSessionsModal userId={userId} hash={hash} name={name} />, {
      right: true,
    });
  };
  return <div onClick={userId ? onClick : () => {}}>{name}</div>;
}
