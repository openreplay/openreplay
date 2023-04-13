import React from 'react'
import Highlight from 'react-highlight'
import stl from './highlightCode.module.css'
import { CopyButton } from 'UI'

function HighlightCode({ className = 'js', text = ''}) {
  return (
    <div className={stl.snippetWrapper}>
      <div className="absolute mt-1 mr-2 right-0">
        <CopyButton content={text} />
      </div>
      <Highlight className={className}>
        {text}
      </Highlight>
    </div>
  )
}

export default HighlightCode
