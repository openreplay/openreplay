import React, { useEffect } from 'react'
import { Input, Icon } from 'UI'
import { connectPlayer, toggleEvents, scale } from 'Player';

function EventSearch(props) {
  const { onChange, clearSearch, value, header, toggleEvents, setActiveTab } = props;

  useEffect(() => {
    return () => {
      clearSearch()
    }
  }, [])

  return (
    <div className="flex items-center w-full relative">
      <div className="flex flex-1 flex-col">
        <div className='flex flex-center justify-between'>
          <span>{header}</span>
          <div
            onClick={() => { setActiveTab(''); toggleEvents(); }}
            className=" flex items-center justify-center bg-white cursor-pointer"
          >
            <Icon name="close" size="18" />
          </div>
        </div>
          <div className="flex items-center mt-2">
            <Input
              autoFocus
              type="text"
              placeholder="Filter by Event Type, URL or Keyword"
              className="inset-0 w-full"
              name="query"
              value={value}
              onChange={onChange}
              wrapperClassName="w-full"
              style={{ height: '32px' }}
              autoComplete="off chromebugfix"
            />
          </div>
      </div>
    </div>
  )
}

export default connectPlayer(() => ({}), { toggleEvents })(EventSearch)
