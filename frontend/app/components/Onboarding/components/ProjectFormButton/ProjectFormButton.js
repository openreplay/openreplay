import React, { useState } from 'react'
import { connect } from 'react-redux'
import { SlideModal } from 'UI'
import NewSiteForm from '../../../Client/Sites/NewSiteForm'
import { init } from 'Duck/site';

const ProjectFormButton = ({ sites, siteId, init }) => {
  const [showModal, setShowModal] = useState(false)
  const site = sites.find(({ id }) => id === siteId)

  const closeModal = () => setShowModal(!showModal);
  const openModal = () => {
    setShowModal(true)
    init(site)
  };

  return (
    <>
      <span
        className="text-3xl font-bold ml-2 color-teal underline-dashed cursor-pointer"
        onClick={ () => openModal()}
      >{site && site.name}</span>
      <SlideModal
        title={ 'Project' }
        size="small"
        isDisplayed={ showModal }
        content={ <NewSiteForm onClose={ closeModal } /> }
        onClose={ closeModal }
      />
    </>
  )
}

export default connect(state => ({
  siteId: state.getIn([ 'site', 'siteId' ]),
  sites: state.getIn([ 'site', 'list' ]),
}), { init })(ProjectFormButton)