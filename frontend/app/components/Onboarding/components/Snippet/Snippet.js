import React, { useState } from 'react'
import { Controlled as CodeMirror } from 'react-codemirror2'
import cn from 'classnames'
import stl from './snippet.css'

export default function Snippet({ text }) {
  const [copied, setCopied] = useState(false)
  
  
  const copyHandler = (code) => {
    setCopied(true);
    copy(code);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };  

  return (
    <div className={ cn(stl.snippetsWrapper, 'bg-gray-light-shade rounded p-3') }>
      <button className={ stl.codeCopy } onClick={ () => copyHandler(_snippet) }>{ copied ? 'copied' : 'copy' }</button>
      <CodeMirror
        value={ text }
        className={ stl.snippet }
        options={{
          autoCursor: false,
          height: 50,
          // mode: 'javascript',
          theme: 'docs',
          readOnly: true,
          showCursorWhenSelecting: false,
          scroll: false
        }}
      />
    </div>
  )
}
