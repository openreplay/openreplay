import React from 'react'

function SectionWrapper({ title, children }) {
  return (
    <div className="mb-3">
      <div className="flex my-2">
        <div className="mr-auto color-gray-medium uppercase">{title}</div>
        <div className="color-gray-medium">DURATION</div>
      </div>
      <div>
        { children }
      </div>
    </div>
  )
}

export default SectionWrapper
