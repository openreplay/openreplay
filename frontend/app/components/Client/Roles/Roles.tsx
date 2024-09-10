import React, { useEffect } from 'react';
import cn from 'classnames';
import { Loader, NoContent, Button, Tooltip } from 'UI';
import { connect } from 'react-redux';
import stl from './roles.module.css';
import RoleForm from './components/RoleForm';
import RoleItem from './components/RoleItem';
import { confirm } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import { useModal } from 'App/components/Modal';
import { useStore } from "App/mstore";
import { observer } from 'mobx-react-lite';

interface Props {
    loading: boolean;
    init: (role?: any) => void;
    edit: (role: any) => void;
    instance: any;
    roles: any[];
    deleteRole: (id: any) => Promise<void>;
    fetchList: () => Promise<void>;
    account: any;
    permissionsMap: any;
    removeErrors: any;
    resetErrors: () => void;
    projectsMap: any;
}

function Roles(props: Props) {
    const { roleStore } = useStore();
    const roles = roleStore.list;
    const loading = roleStore.loading;
    const init = roleStore.init;
    const deleteRole = roleStore.deleteRole;
    const permissionsMap: any = {};
    roleStore.permissions.forEach((p: any) => {
        permissionsMap[p.value] = p.text;
    });
    const { account, projectsMap } = props;
    const { showModal, hideModal } = useModal();
    const isAdmin = account.admin || account.superAdmin;

    useEffect(() => {
        void roleStore.fetchRoles();
    }, []);

    const editHandler = (role: any) => {
        init(role);
        showModal(<RoleForm closeModal={hideModal} permissionsMap={permissionsMap} deleteHandler={deleteHandler} />, { right: true });
    };

    const deleteHandler = async (role: any) => {
        if (
            await confirm({
                header: 'Roles',
                confirmation: `Are you sure you want to remove this role?`,
            })
        ) {
            deleteRole(role.roleId).then(hideModal);
        }
    };

    return (
        <React.Fragment>
            <Loader loading={loading}>
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className={cn(stl.tabHeader, 'flex items-center')}>
                        <div className="flex items-center mr-auto px-5 pt-5">
                            <h3 className={cn(stl.tabTitle, 'text-2xl')}>Roles and Access</h3>
                            <Tooltip title="You don’t have the permissions to perform this action." disabled={isAdmin}>
                                <Button variant="primary" onClick={() => editHandler({})}>Add</Button>
                            </Tooltip>
                        </div>
                    </div>

                    <NoContent title="No roles are available" size="small" show={false}>
                        <div className={''}>
                            <div className={cn('flex items-start py-3 border-b px-5 pr-20 font-medium')}>
                                <div className="" style={{ width: '20%' }}>
                                    Title
                                </div>
                                <div className="" style={{ width: '30%' }}>
                                    Project Access
                                </div>
                                <div className="" style={{ width: '50%' }}>
                                    Feature Access
                                </div>
                                <div></div>
                            </div>
                            {roles.map((role) => (
                                <RoleItem
                                    key={role.roleId}
                                    role={role}
                                    isAdmin={isAdmin}
                                    permissions={permissionsMap}
                                    projects={projectsMap}
                                    editHandler={editHandler}
                                    deleteHandler={deleteHandler}
                                />
                            ))}
                        </div>
                    </NoContent>
                </div>
            </Loader>
        </React.Fragment>
    );
}

export default connect(
    (state: any) => {
        const projects = state.getIn(['site', 'list']);
        return {
            account: state.getIn(['user', 'account']),
            projectsMap: projects.reduce((acc: any, p: any) => {
                acc[p.id] = p.name;
                return acc;
            }, {}),
        };
    }
)(withPageTitle('Roles & Access - OpenReplay Preferences')(observer(Roles)));
