import React, { useEffect } from 'react';
import { PageTitle } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver, observer } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import withPageTitle from 'HOCs/withPageTitle';
import UserSearch from './components/UserSearch';
import UserForm from './components/UserForm';
import AddUserButton from './components/AddUserButton';
import UserList from './components/UserList';
import { useTranslation } from 'react-i18next';

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
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between px-5 pt-5">
        <PageTitle
          title={
            <div>
              {t('Team')}&nbsp;
              <span className="color-gray-medium">{userCount}</span>
            </div>
          }
        />
        <div className="flex items-center">
          <AddUserButton
            btnVariant={isOnboarding ? 'outline' : 'primary'}
            isAdmin={isAdmin}
            onClick={() => editHandler(null)}
          />
          <div className="mx-2" />
          {!isOnboarding && <UserSearch />}
        </div>
      </div>
      <UserList isEnterprise={isEnterprise} isOnboarding={isOnboarding} />
    </div>
  );
}

export default withPageTitle('Team - OpenReplay Preferences')(
  observer(UsersView),
);
