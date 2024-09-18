import React from 'react';
import { Tooltip, Button } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { connect } from 'react-redux';
import { useModal } from 'App/components/Modal';
import NewSiteForm from '../NewSiteForm';

const PERMISSION_WARNING = 'You don’t have the permissions to perform this action.';
const LIMIT_WARNING = 'You have reached site limit.';

function AddProjectButton({ isAdmin = false }: any) {
  const { userStore, projectsStore } = useStore();
  const init = projectsStore.initProject;
  const { showModal, hideModal } = useModal();
  const limits = userStore.limits;
  const canAddProject = isAdmin && (limits.projects === -1 || limits.projects > 0)

  const onClick = () => {
    init({});
    showModal(<NewSiteForm onClose={hideModal} />, { right: true });
  };
  return (
    <Tooltip
      title={`${!isAdmin ? PERMISSION_WARNING : !canAddProject ? LIMIT_WARNING : 'Add a Project'}`}
      disabled={isAdmin || canAddProject}
    >
      <Button variant="primary" onClick={onClick} disabled={!canAddProject || !isAdmin}>
        Add Project
      </Button>
    </Tooltip>
  );
}

export default observer(AddProjectButton);
