import React from 'react'
import { Icon } from 'UI';
import stl from './escapeButton.css'

function EscapeButton({ onClose = null}) {
  return (
    <div className={ stl.closeWrapper } onClick={ onClose }>
      <Icon name="close" size="16" />
      <div>{ 'ESC' }</div>
    </div>
  )
}

export default EscapeButton
