import React, { useEffect } from 'react';
import UserList from './components/UserList';
import { PageTitle } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import UserSearch from './components/UserSearch';

function UsersView(props) {
    const { userStore, roleStore } = useStore();
    const userCount = useObserver(() => userStore.list.length);
    const roles = useObserver(() => roleStore.list);

    useEffect(() => {
        if (roles.length === 0) {
            roleStore.fetchRoles();
        }
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between">
                <PageTitle
                    title={<div>Team <span className="color-gray-medium">{userCount}</span></div>}
                    actionButton={(
                        <div className="ml-2">test</div>
                    )}
                />
                <div>
                    <UserSearch />
                </div>
            </div>
            <UserList />
        </div>
    );
}

export default UsersView;