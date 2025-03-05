import React from 'react';
import { Tooltip } from 'UI';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import NewSiteForm from '../NewSiteForm';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

const PERMISSION_WARNING = (t: TFunction) =>
  t('You don’t have the permissions to perform this action.');
const LIMIT_WARNING = (t: TFunction) => t('You have reached site limit.');

function AddProjectButton({ isAdmin = false }: any) {
  const { t } = useTranslation();
  const { userStore, projectsStore } = useStore();
  const init = projectsStore.initProject;
  const { showModal, hideModal } = useModal();
  const { limits } = userStore;
  const canAddProject =
    isAdmin && (limits.projects === -1 || limits.projects > 0);

  const onClick = () => {
    init({});
    showModal(<NewSiteForm onClose={hideModal} />, { right: true });
  };
  return (
    <Tooltip
      title={`${!isAdmin ? PERMISSION_WARNING(t) : !canAddProject ? LIMIT_WARNING(t) : t('Add a Project')}`}
      disabled={isAdmin || canAddProject}
    >
      <Button
        type="primary"
        onClick={onClick}
        disabled={!canAddProject || !isAdmin}
      >
        {t('Add Project')}
      </Button>
    </Tooltip>
  );
}

export default observer(AddProjectButton);
