import React from 'react'

function TabTag({ tabNum }: { tabNum?: React.ReactNode }) {
  return (
    <div className={'w-fit px-2 border border-gray-light rounded text-sm whitespace-nowrap'}>
      {tabNum}
    </div>
  )
}

export default TabTag