import React from 'react'
import FeatureFlag from 'App/mstore/types/FeatureFlag'
import { Icon, Toggler, Link } from 'UI'
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function FFlagItem({ flag }: { flag: FeatureFlag }) {
  const { featureFlagsStore } = useStore();

  const onFlagClick = () => {
    featureFlagsStore.getFlagById(flag.featureFlagId);
  }
  return (
    <div className={'flex items-center w-full py-2 border-b'} onClick={onFlagClick}>
      <Link style={{ flex: 1 }} to={flag.flagKey}>
        <div className={'flex items-center gap-2'}>
          <div className={'p-2 bg-gray-lightest'}>
            <Icon name={flag.isSingleOption ? 'flag-single' : 'fflag-multi'} />
          </div>
          {flag.flagKey}
        </div>
      </Link>
      <div style={{ flex: 1 }}>{flag.createdAt}</div>
      <div style={{ flex: 1 }}>
        <Icon name={'person-fill'} />

        {flag.author}
      </div>
      <div style={{ flex: 1 }}>
        <Toggler
          checked={flag.isActive}
          name={'persist-flag'}
          label={flag.isActive ? 'Enabled' : 'Disabled'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => console.log(e.target.checked)}
        />
      </div>
    </div>
  )
}

export default observer(FFlagItem);
