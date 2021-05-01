import React from 'react'
import { Button } from 'UI'

export default function DocLink({ link, label }) {
  const openLink = () => {
    window.open(link, '_blank')
  }
  
  return (
    <div>
      <Button outline onClick={openLink}>
        { label }
      </Button>
    </div>
  )
}
