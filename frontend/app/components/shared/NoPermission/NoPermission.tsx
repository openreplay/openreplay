import { EmptyState } from '@/ui/feedback/EmptyState';
import React from 'react';
import { useTranslation } from 'react-i18next';

function NoPermission() {
  const { t } = useTranslation();
  return (
    <EmptyState
      state="no-access"
      title={t('Your role has no access here')}
      hint={t(
        'An admin sets what each role can open, in Team. Ask one to add this to yours.',
      )}
    />
  );
}

export default NoPermission;
