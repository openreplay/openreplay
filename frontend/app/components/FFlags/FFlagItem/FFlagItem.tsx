import React from 'react'
import FeatureFlag from 'App/mstore/types/FeatureFlag'
import { Icon, Toggler, Link } from 'UI'
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { resentOrDate } from 'App/date';
import { toast } from 'react-toastify';

function FFlagItem({ flag }: { flag: FeatureFlag }) {
  const { featureFlagsStore, userStore } = useStore();

  const toggleActivity = () => {
    flag.setIsEnabled(!flag.isActive);
    featureFlagsStore.updateFlag(flag, true).then(() => {
      toast.success('Feature flag updated.');
    })
  }

  const flagIcon = flag.isSingleOption ? 'fflag-single' : 'fflag-multi' as const
  const flagOwner = flag.updatedBy || flag.createdBy
  const user = userStore.list.length > 0 ? userStore.list.find(u => parseInt(u.userId) === flagOwner!)?.name : flagOwner;
  return (
    <div className={'w-full py-2 border-b'}>
      <div className={'flex items-center'}>
        <Link style={{ flex: 1 }} to={`feature-flags/${flag.featureFlagId}`}>
          <div className={'flex items-center gap-2 link'}>
            <Icon name={flagIcon} size={32} />
            {flag.flagKey}
          </div>
        </Link>
        <div style={{ flex: 1 }}>{flag.isSingleOption ? 'Single Option' : 'Multivariant'}</div>
        <div style={{ flex: 1 }}>{resentOrDate(flag.updatedAt || flag.createdAt)}</div>
        <div style={{ flex: 1 }} className={'flex items-center gap-2'}>
          <Icon name={'person-fill'} />
          {user}
        </div>
        <div style={{ marginLeft: 'auto', width: 115 }}>
          <Toggler
            checked={flag.isActive}
            name={'persist-flag'}
            label={flag.isActive ? 'Enabled' : 'Disabled'}
            onChange={toggleActivity}
          />
        </div>
      </div>
      {flag.description ? <div className={'text-disabled-text pt-2'}>{flag.description}</div> : null}
    </div>
  );
}

export default observer(FFlagItem);
