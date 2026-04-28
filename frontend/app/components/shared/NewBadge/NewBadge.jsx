import React from 'react';
import stl from './newBadge.module.css';
import { useTranslation } from 'react-i18next';

function NewBadge() {
  const { t } = useTranslation();
  return <div className={stl.newBadge}>{t('New')}</div>;
}

export default NewBadge;
