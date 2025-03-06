import withPageTitle from 'HOCs/withPageTitle';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { Loader, NoContent, Tooltip, confirm } from 'UI';
import { Button } from 'antd';

import RoleForm from './components/RoleForm';
import RoleItem from './components/RoleItem';
import stl from './roles.module.css';
import { useTranslation } from 'react-i18next';

function Roles() {
  const { t } = useTranslation();
  const { roleStore, projectsStore, userStore } = useStore();
  const { account } = userStore;
  const projectsMap = projectsStore.list.reduce((acc: any, p: any) => {
    acc[p.id] = p.name;
    return acc;
  }, {});
  const roles = roleStore.list;
  const { loading } = roleStore;
  const { init } = roleStore;
  const { deleteRole } = roleStore;
  const permissionsMap: any = {};
  roleStore.permissions.forEach((p: any) => {
    permissionsMap[p.value] = p.text;
  });
  const { showModal, hideModal } = useModal();
  const isAdmin = account.admin || account.superAdmin;

  useEffect(() => {
    void roleStore.fetchRoles();
  }, []);

  const editHandler = (role: any) => {
    init(role);
    showModal(
      <RoleForm
        closeModal={hideModal}
        permissionsMap={permissionsMap}
        deleteHandler={deleteHandler}
      />,
      { right: true },
    );
  };

  const deleteHandler = async (role: any) => {
    if (
      await confirm({
        header: t('Roles'),
        confirmation: t('Are you sure you want to remove this role?'),
      })
    ) {
      deleteRole(role.roleId).then(hideModal);
    }
  };

  return (
    <Loader loading={loading}>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className={cn(stl.tabHeader, 'flex items-center')}>
          <div className="flex items-center mr-auto px-5 pt-5">
            <h3 className={cn(stl.tabTitle, 'text-2xl')}>
              {t('Roles and Access')}
            </h3>
            <Tooltip
              title={t(
                'You don’t have the permissions to perform this action.',
              )}
              disabled={isAdmin}
            >
              <Button type="primary" onClick={() => editHandler({})}>
                {t('Add')}
              </Button>
            </Tooltip>
          </div>
        </div>

        <NoContent
          title={t('No roles are available')}
          size="small"
          show={false}
        >
          <div className="">
            <div
              className={cn(
                'flex items-start py-3 border-b px-5 pr-20 font-medium',
              )}
            >
              <div className="" style={{ width: '20%' }}>
                {t('Title')}
              </div>
              <div className="" style={{ width: '30%' }}>
                {t('Project Access')}
              </div>
              <div className="" style={{ width: '50%' }}>
                {t('Feature Access')}
              </div>
              <div />
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
  );
}

export default withPageTitle('Roles & Access - OpenReplay Preferences')(
  observer(Roles),
);
