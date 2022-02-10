import React from 'react'
import { IconButton } from 'UI'

function SessionCopyLink() {
  return (
    <div className="flex justify-between items-center w-full border-t -mx-4 px-4">
        <IconButton label="Copy Link" icon="link-45deg" />
        <div>Copied to Clipboard</div>
    </div>
  )
}

export default SessionCopyLink