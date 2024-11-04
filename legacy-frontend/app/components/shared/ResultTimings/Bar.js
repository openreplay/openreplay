import React from 'react'

function Bar({ start, end, color = '#CCCCCC' }) {
  return (
    <div
      style={{ left: start + '%', right: end + '%', backgroundColor: color }}
      className="bg-red absolute top-0 left-0 h-4"
    />
  )
}

export default Bar
