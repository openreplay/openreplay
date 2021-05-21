import React from 'react'
import { Button, Icon } from 'UI'

export default function DocLink({ className = '', url, label }) {
  const openLink = () => {
    window.open(url, '_blank')
  }
  
  return (
    <div className={className}>
      <Button outline onClick={openLink}>
        <div className="flex items-center">
          <span className="mr-2">{ label }</span>
          <Icon name="external-link-alt" color="teal" />
        </div>
      </Button>
    </div>
  )
}
