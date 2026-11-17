import { PageCard } from '@/ui/layout/PageCard';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

function LogsPage() {
  const { t } = useTranslation();
  return (
    <PageCard title={t('Logs')}>
      <div />
    </PageCard>
  );
}

export default observer(LogsPage);
