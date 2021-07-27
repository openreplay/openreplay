import React from 'react'
import { CopyButton } from 'UI'
import cn from 'classnames'

function InviteSuccessMessage() {
  return (
    <div className="flex items-center">
      <div>Invite created succssfully</div>
      <CopyButton
        content={"test"}
        className={cn('mt-2 mr-2')}
        btnText="Copy invite link"
      />
    </div>
  )
}

export default InviteSuccessMessage
