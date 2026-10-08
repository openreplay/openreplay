import { FilterStrip } from '@/ui/filters/FilterStrip';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

function TabSelector() {
  const { t } = useTranslation();
  const { uiPlayerStore } = useStore();
  return (
    <FilterStrip
      label={t('Tabs shown')}
      selected={[uiPlayerStore.dataSource]}
      onSelect={(v) => uiPlayerStore.changeDataSource(v as 'all' | 'current')}
      items={[
        { key: 'all', label: t('All tabs') },
        { key: 'current', label: t('Current tab') },
      ]}
    />
  );
}

export default observer(TabSelector);
