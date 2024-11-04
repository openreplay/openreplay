import React from 'react'

function Barwrapper({ title, duration, children }) {
  let _duration = Math.floor(parseInt(duration));
  _duration = _duration < 1 ?  ' < 1' : _duration;

  return (
    <div>
      <div className="flex items-center mb-2 my-2">
        <div className="w-3/12">{title}</div>
        <div className="w-6/12 relative h-4">
          {children}
        </div>
        <div className="w-3/12 text-right">{_duration + ' ms'}</div>
      </div>
    </div>
  )
}

export default Barwrapper
