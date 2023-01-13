import React from 'react';
import { Tooltip, Button } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { init, remove, fetchGDPR } from 'Duck/site';
import { connect } from 'react-redux';
import { useModal } from 'App/components/Modal';
import NewSiteForm from '../NewSiteForm';

const PERMISSION_WARNING = 'You don’t have the permissions to perform this action.';
const LIMIT_WARNING = 'You have reached site limit.';

function AddProjectButton({ isAdmin = false, init = () => {} }: any) {
  const { userStore } = useStore();
  const { showModal, hideModal } = useModal();
  const limtis = useObserver(() => userStore.limits);
  const canAddProject = useObserver(
    () => isAdmin && (limtis.projects === -1 || limtis.projects > 0)
  );

  const onClick = () => {
    init();
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

export default connect(null, { init, remove, fetchGDPR })(AddProjectButton);
