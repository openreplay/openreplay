import React, { useState } from 'react'
import { connect } from 'react-redux'
import { SlideModal } from 'UI'
import NewSiteForm from '../../../Client/Sites/NewSiteForm'

const ProjectFormButton = ({ children, site }) => {
  const [showModal, setShowModal] = useState(false)

  const closeModal = () => setShowModal(!showModal);

  return (
    <>
      <span
        className="text-3xl font-bold ml-2 color-teal underline-dashed cursor-pointer"
        onClick={ () => setShowModal(true)}
      >{site && site.name}</span>
      {/* { React.cloneElement( children, { onClick: () => setShowModal(true) } ) } */}
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
  site: state.getIn([ 'site', 'instance' ]),
}))(ProjectFormButton)