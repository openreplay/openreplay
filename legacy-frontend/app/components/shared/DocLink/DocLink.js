import React from 'react'
import { Button, Icon } from 'UI'

export default function DocLink({ className = '', url, label }) {
  const openLink = () => {
    window.open(url, '_blank')
  }
  
  return (
    <div className={className}>
      <Button variant="text-primary" onClick={openLink}>
          <span className="mr-2">{ label }</span>
          <Icon name="external-link-alt" color="teal" />
      </Button>
    </div>
  )
}
