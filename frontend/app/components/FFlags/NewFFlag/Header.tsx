import React from 'react';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { ItemMenu } from 'UI';
import { useStore } from 'App/mstore';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { fflags, withSiteId } from "App/routes";
import { Button } from 'antd';

function Header({ current, onCancel, onSave, isNew, siteId }: any) {
  const { featureFlagsStore } = useStore();
  const navigate = useNavigate()

  const deleteHandler = () => {
    featureFlagsStore.deleteFlag(current.featureFlagId).then(() => {
      toast.success('Feature flag deleted.');
      navigate(withSiteId(fflags(), siteId));
    });
  };

  const menuItems = [{ icon: 'trash', text: 'Delete', onClick: deleteHandler }];
  return (
    <>
      <div>
        <h1 className={cn('text-2xl')}>
          {!current.flagKey ? 'New Feature Flag' : current.flagKey}
        </h1>
      </div>

      <div className={'flex items-center gap-2'}>
        <Button type="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="primary" onClick={onSave}>
          Save
        </Button>
        {!isNew ? <ItemMenu bold items={menuItems} /> : null}
      </div>
    </>
  );
}

export default observer(Header);
