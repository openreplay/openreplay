import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

function NewProjectButton({ onClick, isAdmin = false }: any) {
    const { userStore } = useStore();
    const limtis = useObserver(() => userStore.limits);
    const canAddProject = useObserver(() => isAdmin && (limtis.projects === -1 || limtis.projects > 0));

    return (
        <div
            className={cn('flex items-center justify-center py-3 cursor-pointer hover:bg-active-blue ', { 'disabled' : !canAddProject })}
            onClick={onClick}
          >
            <Icon 
              name="plus"
              size={12}
              className="mr-2"
              color="teal"
            /> 
            <span className="color-teal">Add New Project</span>
        </div>
    );
}

export default NewProjectButton;