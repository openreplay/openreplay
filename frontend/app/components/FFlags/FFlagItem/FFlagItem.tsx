import React from 'react'
import FeatureFlag from 'App/mstore/types/FeatureFlag'
import { Icon, Toggler, Link } from 'UI'

function FFlagItem({ flag }: { flag: FeatureFlag }) {

  return (
    <div className={'flex items-center w-full py-2 border-b'}>
      <div style={{ flex: 1 }}>icon + {flag.isSingleOption}</div>
      <Link style={{ flex: 1 }} to={flag.key}>{flag.key}</Link>
      <div style={{ flex: 1 }}>{flag.createdAt}</div>
      <div style={{ flex: 1 }}>
        <Icon name={'person-fill'} />

        {flag.author}
      </div>
      <div style={{ flex: 1 }}>
        <Toggler
          checked={flag.isEnabled}
          name={'persist-flag'}
          label={flag.isEnabled ? 'Enabled' : 'Disabled'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => console.log(e.target.checked)}
        />
      </div>
    </div>
  )
}

export default FFlagItem
