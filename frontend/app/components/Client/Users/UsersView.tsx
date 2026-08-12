import withPageTitle from 'HOCs/withPageTitle';
import { observer, useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';

import PreferencesPage from '../PreferencesPage';
import AddUserButton from './components/AddUserButton';
import UserForm from './components/UserForm';
import UserList from './components/UserList';
import UserSearch from './components/UserSearch';

interface Props {
  isOnboarding?: boolean;
}
function UsersView({ isOnboarding = false }: Props) {
  const { t } = useTranslation();
  const { userStore, roleStore } = useStore();
  const { account } = userStore;
  const { isEnterprise } = userStore;
  const userCount = useObserver(() => userStore.list.length);
  const roles = useObserver(() => roleStore.list);
  const { showModal } = useModal();
  const isAdmin = account.admin || account.superAdmin;

  const editHandler = (user: any = null) => {
    userStore.initUser(user).then(() => {
      showModal(<UserForm />, { right: true });
    });
  };

  useEffect(() => {
    if (roles.length === 0 && isEnterprise) {
      void roleStore.fetchRoles();
    }
  }, []);

  return (
    <PreferencesPage
      title={t('Team')}
      value={userCount}
      flush
      actions={
        <>
          <AddUserButton
            btnVariant={isOnboarding ? 'outline' : 'primary'}
            isAdmin={isAdmin}
            onClick={() => editHandler(null)}
          />
          {!isOnboarding && <UserSearch />}
        </>
      }
    >
      <UserList isEnterprise={isEnterprise} isOnboarding={isOnboarding} />
    </PreferencesPage>
  );
}

export default withPageTitle('Team - OpenReplay Preferences')(
  observer(UsersView),
);
