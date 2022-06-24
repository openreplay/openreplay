import React, { useState } from 'react'
import { Icon } from 'UI';
import cn from 'classnames';
import stl from './errorFrame.module.css';

function ErrorFrame({ frame = {}, showRaw, isFirst }) {
  const [open, setOpen] = useState(isFirst)
  const hasContext = frame.context && frame.context.length > 0;
  return (
    <div>
      { showRaw ? 
        <div className={stl.rawLine}>at { frame.function ? frame.function : '?' } <span className="color-gray-medium">({`${frame.filename}:${frame.lineNo}:${frame.colNo}`})</span></div>
      :
        <div className={stl.formatted}>
          <div className={cn(stl.header, 'flex items-center cursor-pointer')} onClick={() => setOpen(!open)}>
            <div className="truncate">
              <span className="font-medium">{ frame.absPath }</span>
              { frame.function && 
              <>
                <span>{' in '}</span> 
                <span className="font-medium"> {frame.function} </span>
              </>
              }
              <span>{' at line '}</span> 
              <span className="font-medium">
                {frame.lineNo}:{frame.colNo}
              </span>
            </div>
            { hasContext && 
              <div className="ml-auto mr-3">
                <Icon name={ open ? 'minus' : 'plus'} size="14" color="gray-medium" />
              </div>
            }
          </div>
          { open && hasContext &&
            <ol start={ frame.context[0][0]} className={stl.content}>
              { frame.context.map(i => (
                <li 
                  key={i[0]}
                  className={ cn("leading-7  text-sm break-all h-auto pl-2", { [stl.errorLine] :i[0] == frame.lineNo }) }
                >
                  <span>{ i[1].replace(/ /g, "\u00a0") }</span>
                </li>
              ))}
            </ol>
          }
        </div>
      }
    </div>
  )
}

export default ErrorFrame;
