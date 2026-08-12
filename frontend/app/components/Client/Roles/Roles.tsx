import withPageTitle from 'HOCs/withPageTitle';
import { Button } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { Loader, NoContent, Tooltip, confirm } from 'UI';

import PreferencesPage from '../PreferencesPage';
import RoleForm from './components/RoleForm';
import RoleItem from './components/RoleItem';

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
      <PreferencesPage
        title={t('Roles and Access')}
        flush
        actions={
          <Tooltip
            title={t('You don’t have the permissions to perform this action.')}
            disabled={isAdmin}
          >
            <Button type="primary" size="small" onClick={() => editHandler({})}>
              {t('Add')}
            </Button>
          </Tooltip>
        }
      >
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
      </PreferencesPage>
    </Loader>
  );
}

export default withPageTitle('Roles & Access - OpenReplay Preferences')(
  observer(Roles),
);
