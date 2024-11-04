import React from 'react'
import copy from 'copy-to-clipboard'
import { useState } from 'react'

const CopyPath = ({ data }) => {
  const [copied, setCopied] = useState(false)

  const copyHandler = () => {
    copy(data.url);
    setCopied(true);
    setTimeout(function() {
      setCopied(false)
    }, 500);
  }

  return (
    <div className="cursor-pointer color-teal" onClick={copyHandler}>
      { copied ? 'Copied' : 'Copy Path'}
    </div>
  )
}

export default CopyPath
