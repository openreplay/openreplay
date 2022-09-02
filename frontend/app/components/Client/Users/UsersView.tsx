import React, { useEffect } from 'react';
import UserList from './components/UserList';
import { PageTitle } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import UserSearch from './components/UserSearch';
import { useModal } from 'App/components/Modal';
import UserForm from './components/UserForm';
import { connect } from 'react-redux';
import AddUserButton from './components/AddUserButton';
import withPageTitle from 'HOCs/withPageTitle';

interface Props {
    isOnboarding?: boolean;
    account: any;
    isEnterprise: boolean;
}
function UsersView(props: Props) {
    const { account, isEnterprise, isOnboarding = false } = props;
    const { userStore, roleStore } = useStore();
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
            roleStore.fetchRoles();
        }
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between px-5 pt-5">
                <PageTitle
                    title={
                        <div>
                            Team <span className="color-gray-medium">{userCount}</span>
                        </div>
                    }
                />
                <div className="flex items-center">
                    <AddUserButton isAdmin={isAdmin} onClick={() => editHandler(null)} />
                    <div className="mx-2" />
                    <UserSearch />
                </div>
            </div>
            <UserList isEnterprise={isEnterprise} isOnboarding={isOnboarding} />
        </div>
    );
}

export default connect((state: any) => ({
    account: state.getIn(['user', 'account']),
    isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
}))(withPageTitle('Team - OpenReplay Preferences')(UsersView));
