import React, { useEffect } from 'react';
import UserList from './components/UserList';
import { PageTitle } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import UserSearch from './components/UserSearch';
import { useModal } from 'App/components/Modal';
import UserForm from './components/UserForm';
import { observer } from 'mobx-react-lite';
import AddUserButton from './components/AddUserButton';
import withPageTitle from 'HOCs/withPageTitle';

interface Props {
  isOnboarding?: boolean;
}
function UsersView({ isOnboarding = false }: Props) {
  const { userStore, roleStore } = useStore();
  const account = userStore.account;
  const isEnterprise = userStore.isEnterprise;
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
              Team <span className="color-gray-medium">{userCount}</span>
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

export default withPageTitle('Team - OpenReplay Preferences')(observer(UsersView));
