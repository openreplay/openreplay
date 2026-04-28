import React from 'react';
import { useModal } from 'App/components/Modal';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import NewSiteForm from '../../../Client/Sites/NewSiteForm';

function ProjectFormButton() {
  const { projectsStore } = useStore();
  const sites = projectsStore.list;
  const { siteId } = projectsStore;
  const init = projectsStore.initProject;
  const site = sites.find(({ id }) => id === siteId);
  const { showModal, hideModal } = useModal();
  const openModal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    init(site);
    showModal(<NewSiteForm onClose={hideModal} />, { right: true });
  };

  return (
    <span
      className="text-2xl font-bold ml-2 color-teal underline decoration-dotted cursor-pointer"
      onClick={(e) => openModal(e)}
    >
      {site && site.name}
    </span>
  );
}

export default observer(ProjectFormButton);
