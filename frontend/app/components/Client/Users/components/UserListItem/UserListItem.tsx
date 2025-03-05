// @ts-nocheck
import React from 'react';
import { Tooltip, Icon } from 'UI';
import { Button } from 'antd';
import { checkForRecent } from 'App/date';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

function AdminPrivilegeLabel({ user }) {
  const { t } = useTranslation();
  return (
    <>
      {user.isAdmin && (
        <span className="px-2 py-1 bg-gray-lightest rounded border text-sm capitalize">
          {t('Admin')}
        </span>
      )}
      {user.isSuperAdmin && (
        <span className="px-2 py-1 bg-gray-lightest rounded border text-sm capitalize">
          {t('Owner')}
        </span>
      )}
      {!user.isAdmin && !user.isSuperAdmin && (
        <span className="px-2 py-1 bg-gray-lightest rounded border text-sm capitalize">
          {t('Member')}
        </span>
      )}
    </>
  );
}
interface Props {
  isOnboarding?: boolean;
  user: any;
  editHandler?: any;
  generateInvite?: any;
  copyInviteCode?: any;
  isEnterprise?: boolean;
}
function UserListItem(props: Props) {
  const {
    user,
    editHandler = () => {},
    generateInvite = () => {},
    copyInviteCode = () => {},
    isEnterprise = false,
    isOnboarding = false,
  } = props;
  const { t } = useTranslation();

  return (
    <div
      className="grid grid-cols-12 py-4 px-5 items-center select-none hover:bg-active-blue group cursor-pointer"
      onClick={editHandler}
    >
      <div className="col-span-5">
        <span className="mr-2 capitalize">{user.name}</span>
        {/* {isEnterprise && <AdminPrivilegeLabel user={user} />} */}
      </div>
      <div className="col-span-3">
        {!isEnterprise && <AdminPrivilegeLabel user={user} />}
        {isEnterprise && (
          <>
            <span className="px-2 py-1 bg-gray-lightest rounded border text-sm capitalize">
              {user.roleName}
            </span>
            {user.isSuperAdmin ||
              (user.isAdmin && (
                <>
                  <span className="ml-2" />
                  <AdminPrivilegeLabel user={user} />
                </>
              ))}
          </>
        )}
      </div>
      {!isOnboarding && (
        <div className="col-span-2">
          <span>
            {user.createdAt &&
              checkForRecent(user.createdAt, 'LLL dd, yyyy, hh:mm a')}
          </span>
        </div>
      )}

      <div
        className={cn('justify-self-end invisible group-hover:visible', {
          'col-span-2': !isOnboarding,
          'col-span-4': isOnboarding,
        })}
      >
        <div className="grid grid-cols-2 gap-3 items-center justify-end">
          <div>
            {!user.isJoined && user.invitationLink && !user.isExpiredInvite && (
              <Tooltip title={t('Copy Invite Code')} hideOnClick>
                <Button
                  type="text"
                  icon={<Icon name="link-45deg" />}
                  onClick={copyInviteCode}
                />
              </Tooltip>
            )}

            {!user.isJoined && user.isExpiredInvite && (
              <Tooltip title={t('Generate Invite')} hideOnClick>
                <Button
                  icon={<Icon name="link-45deg" />}
                  variant="text"
                  onClick={generateInvite}
                />
              </Tooltip>
            )}
          </div>
          <Button variant="text" icon={<Icon name="pencil" />} />
        </div>
      </div>
    </div>
  );
}

export default UserListItem;
