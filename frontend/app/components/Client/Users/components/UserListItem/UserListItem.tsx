import React from 'react';

interface Props {
    user: any;
}
function UserListItem(props: Props) {
    const { user } = props;
    return (
        <div className="grid grid-cols-12 p-3 py-6 border-b select-none hover:bg-active-blue">
            <div className="col-span-5">{user.email}</div>
            <div className="col-span-3">
                <span className="px-2 py-1 bg-gray-lightest rounded border color-teal text-sm capitalize">
                    {user.roleName}
                </span>
            </div>
            <div className="col-span-3">

            </div>
        </div>
    );
}

export default UserListItem;