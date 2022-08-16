import React from 'react';
import { Popup, IconButton, Button } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const PERMISSION_WARNING = 'You don’t have the permissions to perform this action.';
const LIMIT_WARNING = 'You have reached users limit.';

function AddUserButton({ isAdmin = false, onClick }: any ) {
    const { userStore } = useStore();
    const limtis = useObserver(() => userStore.limits);
    const cannAddUser = useObserver(() => isAdmin && (limtis.teamMember === -1 || limtis.teamMember > 0));
    return (
        <Popup
            content={ `${ !isAdmin ? PERMISSION_WARNING : (!cannAddUser ? LIMIT_WARNING : 'Add team member') }` }
        >
            <Button disabled={ !cannAddUser || !isAdmin } variant="primary" onClick={ onClick }>Add</Button>
            {/* <IconButton
                id="add-button"
                disabled={ !cannAddUser || !isAdmin }
                circle
                icon="plus"
                outline
                onClick={ onClick }
                className="ml-4"
            /> */}
        </Popup>
    );
}

export default AddUserButton;