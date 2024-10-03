import { observer } from 'mobx-react-lite';
import React from 'react';

import NewSiteForm from 'App/components/Client/Sites/NewSiteForm';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';

function NewProjectButton() {
  const { projectsStore } = useStore();
  const { showModal, hideModal } = useModal();

  const onClick = () => {
    projectsStore.initProject({});
    showModal(<NewSiteForm onClose={hideModal} />, { right: true });
  };

  return (
    <li onClick={onClick}>
      <Icon name="folder-plus" size="16" color="teal" />
      <span className="ml-3 color-teal">Add Project</span>
    </li>
  );
}

export default observer(NewProjectButton);
