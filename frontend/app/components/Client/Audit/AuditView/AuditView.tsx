import withPageTitle from 'HOCs/withPageTitle';
import { Button } from 'antd';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Icon } from 'UI';

import Select from 'Shared/Select';
import SelectDateRange from 'Shared/SelectDateRange';

import PreferencesPage from '../../PreferencesPage';
import AuditList from '../AuditList';
import AuditSearchField from '../AuditSearchField';

function AuditView() {
  const { t } = useTranslation();
  const { auditStore } = useStore();
  const order = useObserver(() => auditStore.order);
  const total = useObserver(() => numberWithCommas(auditStore.total));

  useEffect(
    () => () => {
      auditStore.updateKey('searchQuery', '');
    },
    [],
  );

  const exportToCsv = () => {
    auditStore.exportToCsv();
  };

  const onChange = (data) => {
    auditStore.setDateRange(data);
  };

  return useObserver(() => (
    <PreferencesPage
      title={t('Audit Trail')}
      value={total}
      flush
      actions={
        <>
          <SelectDateRange
            period={auditStore.period}
            onChange={onChange}
            right
          />
          <Select
            options={[
              { label: t('Newest First'), value: 'desc' },
              { label: t('Oldest First'), value: 'asc' },
            ]}
            defaultValue={order}
            plain
            size="small"
            onChange={({ value }) => auditStore.updateKey('order', value.value)}
          />
          <AuditSearchField
            onChange={(value) => {
              auditStore.updateKey('searchQuery', value);
              auditStore.updateKey('page', 1);
            }}
          />
          <Button
            type="text"
            size="small"
            icon={<Icon name="grid-3x3" color="teal" />}
            onClick={exportToCsv}
          >
            <span className="ml-2">{t('Export to CSV')}</span>
          </Button>
        </>
      }
    >
      <AuditList />
    </PreferencesPage>
  ));
}

export default withPageTitle('Audit Trail - OpenReplay Preferences')(AuditView);
