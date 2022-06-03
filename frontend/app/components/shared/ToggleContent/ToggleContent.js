import React, { useState } from 'react'
import { Toggler } from 'UI'

function ToggleContent({ label = '', first, second }) {
  const [switched, setSwitched] = useState(true)
  return (
    <div>
      <div className="flex items-center cursor-pointer mb-4">
        <div className="mr-2" onClick={() => setSwitched(!switched)}>{ label }</div>
        <Toggler
          name="sessionsLive"
          onChange={ () => setSwitched(!switched) }
          checked={ !switched }
          style={{ lineHeight: '23px' }}
        />
      </div>
      <div>
        { switched ? first : second }
      </div>
    </div>
  )
}

export default ToggleContent
