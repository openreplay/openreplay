import React from 'react';
import { connect } from 'react-redux';
import NewSiteForm from '../../../Client/Sites/NewSiteForm';
import { init } from 'Duck/site';
import { useModal } from 'App/components/Modal';

const ProjectFormButton = ({ sites, siteId, init }) => {
  const site = sites.find(({ id }) => id === siteId);
  const { showModal, hideModal } = useModal();
  const openModal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    init(site);
    showModal(<NewSiteForm onClose={hideModal} />, { right: true });
  };

  return (
    <>
      <span
        className="text-2xl font-bold ml-2 color-teal underline decoration-dotted cursor-pointer"
        onClick={(e) => openModal(e)}
      >
        {site && site.name}
      </span>
    </>
  );
};

export default connect(
  (state) => ({
    siteId: state.getIn(['site', 'siteId']),
    sites: state.getIn(['site', 'list']),
  }),
  { init }
)(ProjectFormButton);
