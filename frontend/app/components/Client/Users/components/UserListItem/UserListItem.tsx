//@ts-nocheck
import React from 'react';
import { Icon, Popup } from 'UI';
import { checkForRecent } from 'App/date';


const AdminPrivilegeLabel = ({ user }) => {
    return (
        <>
            {user.isAdmin && <span className="px-2 py-1 bg-gray-lightest rounded border text-sm capitalize">Admin</span>}
            {user.isSuperAdmin && <span className="px-2 py-1 bg-gray-lightest rounded border text-sm capitalize">Owner</span>}
        </>
    )
}
interface Props {
    user: any;
    editHandler?: any;
    generateInvite?: any;
    copyInviteCode?: any;
    isEnterprise?: boolean;
}
function UserListItem(props: Props) {
    const {
        user,
        editHandler = () => {},
        generateInvite = () => {},
        copyInviteCode = () => {},
        isEnterprise = false,
    } = props;
    return (
        <div className="grid grid-cols-12 p-3 py-4 border-b items-center select-none hover:bg-active-blue group">
            <div className="col-span-5">
                <span className="mr-2">{user.name}</span>
                {isEnterprise && <AdminPrivilegeLabel user={user} />}
            </div>
            <div className="col-span-3">
                {!isEnterprise && <AdminPrivilegeLabel user={user} />}
                {isEnterprise && (
                    <span className="px-2 py-1 bg-gray-lightest rounded border text-sm capitalize">
                        {user.roleName}
                    </span>
                )}
            </div>
            <div className="col-span-2">
                <span>{user.createdAt && checkForRecent(user.createdAt, 'LLL dd, yyyy, hh:mm a')}</span>
            </div>

            <div className="col-span-2 justify-self-end invisible group-hover:visible">
                <div className="grid grid-cols-2 gap-3 items-center justify-end">
                    <div>
                        {!user.isJoined && user.invitationLink && !user.isExpiredInvite && (
                            <Popup
                                delay={500}
                                content="Copy Invite Code"
                                hideOnClick={true}
                            >
                                <button className='' onClick={copyInviteCode}>
                                    <Icon name="link-45deg" size="16" color="teal"/>
                                </button>
                            </Popup>
                        )}

                        {!user.isJoined && user.isExpiredInvite && (
                            <Popup
                                delay={500}
                                arrow
                                content="Generate Invite"
                                hideOnClick={true}
                            >
                                <button className='' onClick={generateInvite}>
                                    <Icon name="link-45deg" size="16" color="red"/>
                                </button>
                            </Popup>
                        )}
                    </div>
                    <button className='' onClick={editHandler}>
                        <Icon name="pencil" color="teal" size="16" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserListItem;