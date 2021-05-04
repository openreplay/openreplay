import React from 'react'
import { Button } from 'UI'

export default function DocLink({ className = '', url, label }) {
  const openLink = () => {
    window.open(url, '_blank')
  }
  
  return (
    <div className={className}>
      <Button outline onClick={openLink}>
        { label }
      </Button>
    </div>
  )
}
