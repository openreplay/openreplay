import React from 'react';
import { Icon } from 'UI';
import stl from './noPermission.module.css';
import { useTranslation } from 'react-i18next';

interface Props {}
function NoPermission(props: Props) {
  const { t } = useTranslation();
  return (
    <div className={stl.wrapper}>
      <Icon name="shield-lock" size="50" className="py-16" />
      <div className={stl.title}>{t('Not allowed')}</div>
      {t(
        'You don’t have the necessary permissions to access this feature. Please check with your admin.',
      )}
    </div>
  );
}

export default NoPermission;
