import React, { useState } from 'react'
import { Input, Icon } from 'UI'

export default function EventSearch(props) {
  const { onChange, clearSearch, value, header } = props;
  const [showSearch, setShowSearch] = useState(false)
  return (
    <div className="flex items-center w-full">
      <div className="flex-1 relative">
        { showSearch ? 
          <div className="flex items-center">
            <Input
              autoFocus
              type="text"
              placeholder="Filter Events"
              className="absolute inset-0 w-full"
              name="query"
              value={value}
              onChange={onChange}
              style={{ height: '32px' }}
            />
            <div
              onClick={() => { setShowSearch(!showSearch); clearSearch() }}
              className="flex items-center justify-center cursor-pointer absolute right-0"
              style={{ height: '30px', width: '32px' }}
            >
              <Icon name={'close'} size="18" color="teal" />
            </div>
          </div>
        :
          header
        }
      </div>
      { !showSearch &&
        <div
          onClick={() => setShowSearch(!showSearch)}
          className="border rounded flex items-center justify-center bg-white cursor-pointer"
          style={{ height: '32px', width: '32px' }}
        >
          <Icon name={ showSearch ? 'close' : 'search'} size="12" color="teal" />
        </div>
      }
    </div>
  )
}
