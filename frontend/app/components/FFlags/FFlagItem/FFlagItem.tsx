import React from 'react'
import FeatureFlag from 'App/mstore/types/FeatureFlag'
import { Icon, Toggler, Link } from 'UI'
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function FFlagItem({ flag }: { flag: FeatureFlag }) {
  const { featureFlagsStore } = useStore();

  const toggleActivity = () => {
    flag.setIsEnabled(!flag.isActive);
    void featureFlagsStore.updateFlag(flag)
  }

  return (
    <div className={'flex items-center w-full py-2 border-b'}>
      <Link style={{ flex: 1 }} to={`feature-flags/${flag.featureFlagId}`}>
        <div className={'flex items-center gap-2'}>
          <div className={'p-2 bg-gray-lightest'}>
            <Icon name={flag.isSingleOption ? 'flag-single' : 'fflag-multi'} />
          </div>
          {flag.flagKey}
        </div>
      </Link>
      <div style={{ flex: 1 }}>no conditions from api</div>
      <div style={{ flex: 1 }}>{flag.updatedAt || flag.createdAt}</div>
      <div style={{ flex: 1 }} className={"flex items-center gap-2"}>
        <Icon name={'person-fill'} />
        {flag.createdBy || flag.updatedBy}
      </div>
      <div style={{ flex: 1 }}>
        <Toggler
          checked={flag.isActive}
          name={'persist-flag'}
          label={flag.isActive ? 'Enabled' : 'Disabled'}
          onChange={toggleActivity}
        />
      </div>
    </div>
  )
}

export default observer(FFlagItem);
