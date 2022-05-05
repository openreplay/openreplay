import React, { useEffect } from 'react';
import UserList from './components/UserList';
import { PageTitle, Popup, IconButton } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import UserSearch from './components/UserSearch';
import { useModal } from 'App/components/Modal';
import UserForm from './components/UserForm';
import { connect } from 'react-redux';

const PERMISSION_WARNING = 'You don’t have the permissions to perform this action.';
const LIMIT_WARNING = 'You have reached users limit.';
interface Props {
    account: any;
    isEnterprise: boolean;
    limits: any;
}
function UsersView(props: Props) {
    const { account, limits, isEnterprise } = props;
    const { userStore, roleStore } = useStore();
    const userCount = useObserver(() => userStore.list.length);
    const roles = useObserver(() => roleStore.list);
    const { showModal } = useModal();
    
    const reachedLimit = (limits.remaining + userStore.modifiedCount) <= 0;
    const isAdmin = account.admin || account.superAdmin;

    const editHandler = (user = null) => {
        userStore.initUser(user).then(() => {
            showModal(<UserForm />, {});
        });
    }

    useEffect(() => {
        if (roles.length === 0) {
            roleStore.fetchRoles();
        }
    }, []);

    console.log('remaining', limits, reachedLimit)

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
                                    disabled={ reachedLimit || !isAdmin }
                                    circle
                                    icon="plus"
                                    outline
                                    className="ml-3"
                                    onClick={ () => editHandler(null) }
                                />
                            </div>
                            }
                            content={ `${ !isAdmin ? PERMISSION_WARNING : (reachedLimit ? LIMIT_WARNING : 'Add team member') }` }
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
    limits: state.getIn([ 'user', 'account', 'limits', 'teamMember' ]),
    // remaining: this.props.account.limits.teamMember.remaining
}))(UsersView);