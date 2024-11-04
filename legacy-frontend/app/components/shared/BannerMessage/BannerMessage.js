import React from 'react'
import { Icon } from 'UI'

const BannerMessage= (props) => {
  const { icon = 'info-circle', children } = props;

  return (
    <>
      <div>
        <div
          className="rounded text-sm flex items-center p-2 justify-between"
          style={{ backgroundColor: 'rgba(255, 239, 239, 1)', border: 'solid thin rgba(221, 181, 181, 1)'}}
        >
          <div className="flex items-center w-full">
            <div className="flex-shrink-0 w-8 flex justify-center">
              <Icon name={icon} size="14" color="gray-darkest" />
            </div>
            <div className="ml-2color-gray-darkest mr-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default BannerMessage;