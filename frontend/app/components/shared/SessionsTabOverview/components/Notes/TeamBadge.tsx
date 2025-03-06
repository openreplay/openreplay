import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from 'UI';

export default function TeamBadge() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center ml-2">
      <Icon name="user-friends" className="mr-1" color="gray-darkest" />
      <span className="text-sm">{t('Team')}</span>
    </div>
  );
}
