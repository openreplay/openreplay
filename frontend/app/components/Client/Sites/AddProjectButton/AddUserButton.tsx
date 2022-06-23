import React from 'react';
import { Popup, IconButton } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const PERMISSION_WARNING = 'You don’t have the permissions to perform this action.';
const LIMIT_WARNING = 'You have reached site limit.';

function AddProjectButton({ isAdmin = false, onClick }: any ) {
    const { userStore } = useStore();
    const limtis = useObserver(() => userStore.limits);
    const canAddProject = useObserver(() => isAdmin && (limtis.projects === -1 || limtis.projects > 0));
    return (
        <Popup
            content={ `${ !isAdmin ? PERMISSION_WARNING : (!canAddProject ? LIMIT_WARNING : 'Add a Project') }` }
        >
            <IconButton
                id="add-button"
                disabled={ !canAddProject || !isAdmin }
                circle
                icon="plus"
                outline
                onClick={ onClick }
            />
        </Popup>
    );
}

export default AddProjectButton;