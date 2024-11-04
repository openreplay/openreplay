import React from 'react';
import FeatureFlag from 'App/mstore/types/FeatureFlag';
import { Icon, Toggler, Link, TextEllipsis, Tooltip } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { resentOrDate } from 'App/date';
import { toast } from 'react-toastify';
import { fflagRead } from "App/routes";

function FFlagItem({ flag }: { flag: FeatureFlag }) {
  const { featureFlagsStore, userStore } = useStore();

  const toggleActivity = () => {
    const newValue = !flag.isActive;
    flag.setIsEnabled(newValue);
    featureFlagsStore
      .updateFlagStatus(flag.featureFlagId, newValue)
      .then(() => {
        toast.success('Feature flag status has been updated.');
      })
      .catch(() => {
        flag.setIsEnabled(!newValue);
        toast.error('Something went wrong, please try again.');
      });
  };

  const flagIcon = flag.isSingleOption ? 'fflag-single' : ('fflag-multi' as const);
  const flagOwner = flag.updatedBy || flag.createdBy;
  const user =
    userStore.list.length > 0
      ? userStore.list.find((u) => parseInt(u.userId) === flagOwner!)?.name
      : flagOwner;
  return (
    <div className={'w-full py-2 px-6 border-b hover:bg-active-blue'}>
      <div className={'flex items-center'}>
        <Link style={{ flex: 1 }} to={fflagRead(flag.featureFlagId.toString())}>
          <div className={'flex items-center gap-2'}>
            <Tooltip delay={150} title={flag.isSingleOption ? 'Single variant' : 'Multivariant'}>
              <Icon name={flagIcon} size={32} />
            </Tooltip>
            <div className="flex flex-col gap-1" style={{ width: 300 }}>
              <span className={'link'}>{flag.flagKey}</span>
              {flag.description ? (
                <TextEllipsis
                  hintText={flag.description}
                  text={flag.description}
                  style={{ color: 'rgba(0,0,0, 0.6)', fontSize: 12 }}
                />
              ) : null}
            </div>
          </div>
        </Link>
        <div style={{ flex: 1 }}>{resentOrDate(flag.updatedAt || flag.createdAt)}</div>
        <div style={{ flex: 1 }} className={'flex items-center gap-2 capitalize'}>
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
    </div>
  );
}

export default observer(FFlagItem);
