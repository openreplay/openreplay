import React from 'react';
import { Input, CopyButton, Button, Select } from 'UI'
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';

interface Props {
    isSmtp?: boolean;
    isEnterprise?: boolean;
}
function UserForm(props: Props) {
    const { isSmtp = false, isEnterprise = false } = props;
    const isSaving = false;
    const { hideModal } = useModal();
    const { userStore, roleStore } = useStore();
    const user: any = useObserver(() => userStore.instance);
    const roles = useObserver(() => roleStore.list.map(r => ({ label: r.name, value: r.roleId })));
    console.log('roles', roles)

    const onChangeCheckbox = (e: any) => {
        user.updateKey('isAdmin', !user.isAdmin);
    }

    const onSave = () => {
    }

    const write = ({ target: { name, value } }) => {
        user.updateKey(name, value);
    }
    return useObserver(() => (
        <div className="bg-white h-screen p-6" style={{ width: '400px'}}>
            <div className="">
                <h1 className="text-2xl mb-4">{`${user.exists() ? 'Update' : 'Invite'} User`}</h1>
            </div>
            <form onSubmit={ onSave } >
                <div className="form-group">
                    <label>{ 'Full Name' }</label>
                    <Input
                        name="name"
                        autoFocus
                        value={ user.name }
                        onChange={ write }
                        className="w-full"
                        id="name-field"
                    />
                </div>

                <div className="form-group">
                    <label>{ 'Email Address' }</label>
                    <Input
                        disabled={user.exists()}
                        name="email"
                        value={ user.email }
                        onChange={ write }
                        className="w-full"
                    />
                </div>
                { !isSmtp &&
                    <div className={cn("mb-4 p-2 bg-yellow rounded")}>
                        SMTP is not configured (see <a className="link" href="https://docs.openreplay.com/configuration/configure-smtp" target="_blank">here</a> how to set it up).  You can still add new users, but you’d have to manually copy then send them the invitation link.
                    </div>
                }
                <div className="form-group">
                    <label className="flex items-start cursor-pointer">
                        <input
                            name="admin"
                            type="checkbox"
                            value={ user.isAdmin }
                            checked={ !!user.isAdmin }
                            onChange={ onChangeCheckbox }
                            disabled={user.superAdmin}
                            className="mt-1"
                        />
                        <div className="ml-2 select-none">
                            <span>Admin Privileges</span>
                            <div className="text-sm color-gray-medium -mt-1">{ 'Can manage Projects and team members.' }</div>
                        </div>
                    </label>
                </div>
                
                { !isEnterprise && (
                    <div className="form-group">
                        <label htmlFor="role">{ 'Role' }</label>
                        <Select
                            placeholder="Role"
                            selection
                            options={ roles }
                            name="roleId"
                            value={ user.roleId }
                            onChange={ write }
                            className="block"
                        />
                    </div>
                )}
                </form>

                <div className="flex items-center">
                    <div className="flex items-center mr-auto">
                        <Button
                            onClick={ onSave }
                            disabled={ !user.valid() }
                            loading={ isSaving }
                            primary
                            marginRight
                        >
                        { user.exists() ? 'Update' : 'Invite' }
                        </Button>
                        <Button
                            data-hidden={ !user.exists() }
                            onClick={ hideModal }
                            outline
                        >
                        { 'Cancel' }
                        </Button>
                    </div>
                    { !user.isJoined && user.invitationLink &&
                        <CopyButton
                            content={user.invitationLink}
                            className="link"
                            btnText="Copy invite link"
                        />
                    }
                </div>
        </div>
    ));
}

export default UserForm;