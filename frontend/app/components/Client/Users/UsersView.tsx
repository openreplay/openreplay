import React, { useEffect } from 'react';
import UserList from './components/UserList';
import { PageTitle, Popup, IconButton } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import UserSearch from './components/UserSearch';
import { useModal } from 'App/components/Modal';
import UserForm from './components/UserForm';
import { connect } from 'react-redux';

interface Props {
    account: any;
    isEnterprise: boolean;
}
function UsersView(props: Props) {
    const { account, isEnterprise } = props;
    const { userStore, roleStore } = useStore();
    const userCount = useObserver(() => userStore.list.length);
    const roles = useObserver(() => roleStore.list);
    const { showModal } = useModal();
    
    const isAdmin = account.admin || account.superAdmin;
    // const canAddUsers = isAdmin && userCount !== 0; // TODO fetch limits and disable button if limit reached

    const editHandler = (user = null) => {
        userStore.initUser(user).then(() => {
            showModal(<UserForm />, { right: true });
        });
    }

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
                        <Popup
                            trigger={
                            <div>
                                <IconButton
                                    id="add-button"
                                    // disabled={ !canAddUsers }
                                    circle
                                    icon="plus"
                                    outline
                                    className="ml-3"
                                    onClick={ () => editHandler(null) }
                                />
                            </div>
                            }
                            // disabled={ canAddUsers }
                            // content={ `${ !canAddUsers ? (!isAdmin ? PERMISSION_WARNING : LIMIT_WARNING) : 'Add team member' }` }
                            size="tiny"
                            inverted
                            position="top left"
                        />
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

export default connect(state => ({
    account: state.getIn([ 'user', 'account' ]),
    isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
}))(UsersView);