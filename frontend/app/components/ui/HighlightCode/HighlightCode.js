import React from 'react'
import Highlight from 'react-highlight'
import stl from './highlightCode.css'
import cn from 'classnames'
import { CopyButton } from 'UI'

function HighlightCode({ className = 'js', text = ''}) {
  return (
    <div className={stl.snippetWrapper}>
      <CopyButton content={text} className={cn(stl.codeCopy, 'mt-2 mr-2')} />
      <Highlight className={className}>
        {text}
      </Highlight>
    </div>
  )
}

export default HighlightCode
