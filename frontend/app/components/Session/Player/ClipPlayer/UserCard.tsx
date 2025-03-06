import React from 'react';
import { countries } from 'App/constants';
import { useStore } from 'App/mstore';
import { formatTimeOrDate } from 'App/date';
import { Avatar, TextEllipsis, Tooltip } from 'UI';
import cn from 'classnames';
import { capitalize } from 'App/utils';
import { observer } from 'mobx-react-lite';
import Session from 'Types/session';

interface Props {
  session: Session;
  className?: string;
  width?: number;
  height?: number;
}

const UserCard: React.FC<Props> = ({ session, className, width, height }) => {
  const { settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  const {
    userBrowser,
    userDevice,
    userCountry,
    userCity,
    userOs,
    startedAt,
    userNumericHash,
    userDisplayName,
  } = session;

  const avatarBgSize = '38px';

  return (
    <div
      className={cn('bg-white flex items-center w-full', className)}
      style={{ width, height }}
    >
      <div className="flex items-center">
        <Avatar
          iconSize="23"
          width={avatarBgSize}
          height={avatarBgSize}
          seed={userNumericHash}
        />
        <div className="ml-3 overflow-hidden leading-tight">
          <TextEllipsis noHint className="font-medium">
            {userDisplayName}
          </TextEllipsis>
          <div className="text-sm text-gray-500 flex items-center">
            <span style={{ whiteSpace: 'nowrap' }}>
              <Tooltip
                title={`${formatTimeOrDate(startedAt, timezone, true)} ${timezone.label}`}
                className="w-fit !block"
              >
                {formatTimeOrDate(startedAt, timezone)}
              </Tooltip>
            </span>
            <span className="mx-1 font-bold text-xl">&#183;</span>
            {userCity && <span className="mr-1">{userCity},</span>}
            <span>{countries[userCountry]}</span>
            <span className="mx-1 font-bold text-xl">&#183;</span>
            <span>
              {userBrowser && `${capitalize(userBrowser)}, `}
              {`${/ios/i.test(userOs) ? 'iOS' : capitalize(userOs)}, `}
              {capitalize(userDevice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default observer(UserCard);
