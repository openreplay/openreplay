import React, { useState, useEffect } from 'react'
import { Input, Icon } from 'UI'

export default function EventSearch(props) {
  const { onChange, clearSearch, value, header } = props;
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    return () => {
      clearSearch()
    }
  }, [])

  const toggleSearch = () => {
    setShowSearch(!showSearch)
    clearSearch();
  }
  return (
    <div className="flex items-center w-full relative">
      <div className="flex flex-1 flex-col">
        <div className='flex flex-center justify-between'>
          <span>{header}</span>
          <div
            onClick={() => toggleSearch()}
            className=" flex items-center justify-center bg-white cursor-pointer"
          >
            <Icon name={ showSearch ? 'close' : 'search'} size="18" />
          </div>
        </div>
        {showSearch && (
          <div className="flex items-center mt-2">
            <Input
              autoFocus
              type="text"
              placeholder="Filter Events"
              className="inset-0 w-full"
              name="query"
              value={value}
              onChange={onChange}
              style={{ height: '32px' }}
              autocomplete="off"
            />
          </div>
        )}
      </div>
    </div>
  )
}
