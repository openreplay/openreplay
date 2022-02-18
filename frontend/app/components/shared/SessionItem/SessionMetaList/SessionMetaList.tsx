import React from 'react'
import { Popup } from 'UI'
import cn from 'classnames'

interface Props {
  className?: string,
  metaList: []
}
const MAX_LENGTH = 3;
export default function SessionMetaList(props: Props) {
  const { className = '', metaList } = props
  return (
    <div className={cn("text-sm flex items-start", className)}>
      {metaList.slice(0, MAX_LENGTH).map(({ label, value }, index) => (
        <div key={index} className="flex items-center rounded mr-3">
          <span className="rounded-tl rounded-bl bg-gray-light-shade px-2 color-gray-medium">{label}</span>
          <span className="rounded-tr rounded-br bg-gray-lightest px-2 color-gray-dark">{value}</span>
        </div>
      ))}

      {metaList.length > MAX_LENGTH && (
        <Popup
            trigger={ (
              <div className="flex items-center">
                <span className="rounded bg-active-blue color-teal px-2 color-gray-dark cursor-pointer">
                  +{metaList.length - MAX_LENGTH} More
                </span>
              </div>
            ) }
            content={ 
              <div className="flex flex-col">
                {metaList.slice(MAX_LENGTH).map(({ label, value }, index) => (
                  <div key={index} className="flex items-center rounded mb-2">
                    <span className="rounded-tl rounded-bl bg-gray-light-shade px-2 color-gray-medium">{label}</span>
                    <span className="rounded-tr rounded-br bg-gray-lightest px-2 color-gray-dark">{value}</span>
                  </div>
                ))}
              </div>
            }
            on="click"
            position="top right"
            // className={ styles.popup }
            hideOnScroll
        />
      )}
    </div>
  )
}
