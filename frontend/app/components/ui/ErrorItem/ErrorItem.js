import React from 'react'
import cn from 'classnames'
import { IconButton } from 'UI'
import stl from './errorItem.css';

function ErrorItem({ error = {}, onErrorClick, onJump }) {
  return (
    <div className={ cn(stl.wrapper, 'py-3 px-4 flex cursor-pointer') } onClick={onJump}>
      <div className="mr-auto">
        <div className="color-red mb-1 cursor-pointer code-font">
          {error.name}
          <span className="color-gray-darkest ml-2">{ error.stack0InfoString }</span>
        </div>
        <div className="text-sm color-gray-medium">{error.message}</div>
      </div>
      <div className="self-end">
        <IconButton plain onClick={onErrorClick} label="DETAILS" />
      </div>
    </div>
  )
}

export default ErrorItem
