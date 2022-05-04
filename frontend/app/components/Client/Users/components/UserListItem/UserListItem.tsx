import React from 'react';
import { Icon } from 'UI';

interface Props {
    user: any;
    editHandler?: any;
}
function UserListItem(props: Props) {
    const { user, editHandler = () => {} } = props;
    return (
        <div className="grid grid-cols-12 p-3 py-4 border-b items-center select-none hover:bg-active-blue group">
            <div className="col-span-5">{user.name}</div>
            <div className="col-span-3">
                <span className="px-2 py-1 bg-gray-lightest rounded border color-teal text-sm capitalize">
                    {user.roleName}
                </span>
            </div>
            <div className="col-span-4 justify-self-end invisible group-hover:visible">
                <button className='' onClick={editHandler}>
                    <Icon name="pencil" color="teal" size="16" />
                </button>
            </div>
        </div>
    );
}

export default UserListItem;