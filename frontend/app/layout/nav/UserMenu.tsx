import { Chip } from '@/ui/data/Chip';
import { PopoverPanel } from '@/ui/overlays/popover';
import { LogOut, UserRound } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { getInitials } from 'App/utils';
import Version from 'Components/Header/DefaultMenuView/Version';

import { NavItem } from './NavItem';
import './account-menu.css';

interface UserMenuProps {
  onAccount: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactElement;
}

function UserMenu({ onAccount, open, onOpenChange, children }: UserMenuProps) {
  const { t } = useTranslation();
  const { loginStore, userStore } = useStore();
  const { account } = userStore;
  const role = account.superAdmin
    ? t('Owner')
    : account.admin
      ? t('Admin')
      : t('Member');

  const logout = () => {
    loginStore.invalidateSpotJWT();
    window.postMessage({ type: 'orspot:invalidate' }, '*');
    void userStore.logout();
  };

  const card = (
    <div className="m-account-menu m-user-menu">
      <div className="m-account-menu__head">
        <span className="m-user-menu__avatar" aria-hidden="true">
          {getInitials(account.name)}
        </span>
        <span className="m-nav__account-text">
          <span className="m-nav__account-name m-truncate">{account.name}</span>
          <span className="m-nav__account-org m-truncate">{account.email}</span>
        </span>
        <Chip>{role}</Chip>
      </div>
      <div className="m-account-menu__group">
        <NavItem
          icon={<UserRound size={15} />}
          label={t('Account')}
          onClick={() => {
            onAccount();
            onOpenChange(false);
          }}
        />
        <NavItem
          icon={<LogOut size={15} />}
          label={t('Log out')}
          onClick={() => {
            onOpenChange(false);
            logout();
          }}
        />
      </div>
      <Version />
    </div>
  );
  return (
    <PopoverPanel
      content={card}
      open={open}
      onOpenChange={onOpenChange}
      placement="rightBottom"
      className="m-account-root"
      sideOffset={8}
    >
      {children}
    </PopoverPanel>
  );
}

export default observer(UserMenu);
