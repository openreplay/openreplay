import React from 'react';
import { Button } from 'UI';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { ItemMenu } from 'UI';
import { useStore } from 'App/mstore';
import { useHistory } from 'react-router';
import { toast } from 'react-toastify';
import { fflags, withSiteId } from "App/routes";

function Header({ current, onCancel, onSave, isNew, siteId }: any) {
  const { featureFlagsStore } = useStore();
  const history = useHistory();

  const deleteHandler = () => {
    featureFlagsStore.deleteFlag(current.featureFlagId).then(() => {
      toast.success('Feature flag deleted.');
      history.push(withSiteId(fflags(), siteId));
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
        <Button variant="text-primary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave}>
          Save
        </Button>
        {!isNew ? <ItemMenu bold items={menuItems} /> : null}
      </div>
    </>
  );
}

export default observer(Header);
