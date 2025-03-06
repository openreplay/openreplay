import React from 'react';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { ItemMenu } from 'UI';
import { useStore } from 'App/mstore';
import { useHistory } from 'react-router';
import { toast } from 'react-toastify';
import { fflags, withSiteId } from 'App/routes';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

function Header({ current, onCancel, onSave, isNew, siteId }: any) {
  const { t } = useTranslation();
  const { featureFlagsStore } = useStore();
  const history = useHistory();

  const deleteHandler = () => {
    featureFlagsStore.deleteFlag(current.featureFlagId).then(() => {
      toast.success(t('Feature flag deleted.'));
      history.push(withSiteId(fflags(), siteId));
    });
  };

  const menuItems = [
    { icon: 'trash', text: t('Delete'), onClick: deleteHandler },
  ];
  return (
    <>
      <div>
        <h1 className={cn('text-2xl')}>
          {!current.flagKey ? t('New Feature Flag') : current.flagKey}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button type="text" onClick={onCancel}>
          {t('Cancel')}
        </Button>
        <Button type="primary" onClick={onSave}>
          {t('Save')}
        </Button>
        {!isNew ? <ItemMenu bold items={menuItems} /> : null}
      </div>
    </>
  );
}

export default observer(Header);
