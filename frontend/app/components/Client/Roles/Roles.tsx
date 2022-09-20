import React, { useEffect } from 'react';
import cn from 'classnames';
import { Loader, Popup, NoContent, Button } from 'UI';
import { connect } from 'react-redux';
import stl from './roles.module.css';
import RoleForm from './components/RoleForm';
import { init, edit, fetchList, remove as deleteRole, resetErrors } from 'Duck/roles';
import RoleItem from './components/RoleItem';
import { confirm } from 'UI';
import { toast } from 'react-toastify';
import withPageTitle from 'HOCs/withPageTitle';
import { useModal } from 'App/components/Modal';

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
    const { loading, instance, roles, init, edit, deleteRole, account, permissionsMap, projectsMap, removeErrors } = props;
    // const [showModal, setShowmModal] = useState(false);
    const { showModal, hideModal } = useModal();
    const isAdmin = account.admin || account.superAdmin;

    useEffect(() => {
        props.fetchList();
    }, []);

    useEffect(() => {
        if (removeErrors && removeErrors.size > 0) {
            removeErrors.forEach((e: any) => {
                toast.error(e);
            });
        }
        return () => {
            props.resetErrors();
        };
    }, [removeErrors]);

    // const closeModal = (showToastMessage: boolean) => {
    //     if (showToastMessage) {
    //         toast.success(showToastMessage);
    //         props.fetchList();
    //     }
    //     // setShowmModal(false);
    //     setTimeout(() => {
    //         init();
    //     }, 100);
    // };

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
                <div className={stl.wrapper}>
                    <div className={cn(stl.tabHeader, 'flex items-center')}>
                        <div className="flex items-center mr-auto px-5 pt-5">
                            <h3 className={cn(stl.tabTitle, 'text-2xl')}>Roles and Access</h3>
                            <Popup content="You don’t have the permissions to perform this action." disabled={isAdmin}>
                                <Button variant="primary" onClick={() => editHandler({})}>Add</Button>
                            </Popup>
                        </div>
                    </div>

                    <NoContent title="No roles are available." size="small" show={false}>
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
        const permissions = state.getIn(['roles', 'permissions']);
        const permissionsMap: any = {};
        permissions.forEach((p: any) => {
            permissionsMap[p.value] = p.text;
        });
        const projects = state.getIn(['site', 'list']);
        return {
            instance: state.getIn(['roles', 'instance']) || null,
            permissionsMap: permissionsMap,
            roles: state.getIn(['roles', 'list']),
            removeErrors: state.getIn(['roles', 'removeRequest', 'errors']),
            loading: state.getIn(['roles', 'fetchRequest', 'loading']),
            account: state.getIn(['user', 'account']),
            projectsMap: projects.reduce((acc: any, p: any) => {
                acc[p.get('id')] = p.get('name');
                return acc;
            }, {}),
        };
    },
    { init, edit, fetchList, deleteRole, resetErrors }
)(withPageTitle('Roles & Access - OpenReplay Preferences')(Roles));
