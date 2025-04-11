import React, { useEffect } from 'react';
import { PageTitle, Icon } from 'UI';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import Select from 'Shared/Select';
import SelectDateRange from 'Shared/SelectDateRange';
import { numberWithCommas } from 'App/utils';
import withPageTitle from 'HOCs/withPageTitle';
import AuditSearchField from '../AuditSearchField';
import AuditList from '../AuditList';
import { useTranslation } from 'react-i18next';

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
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="flex items-center mb-4 px-5 pt-5">
        <PageTitle
          title={
            <div className="flex items-center">
              <span>{t('Audit Trail')}</span>
              <span className="color-gray-medium ml-2">{total}</span>
            </div>
          }
        />
        <div className="flex items-center ml-auto">
          <div className="mx-2">
            <SelectDateRange
              period={auditStore.period}
              onChange={onChange}
              right
            />
          </div>
          <div className="mx-2">
            <Select
              options={[
                { label: t('Newest First'), value: 'desc' },
                { label: t('Oldest First'), value: 'asc' },
              ]}
              defaultValue={order}
              plain
              onChange={({ value }) =>
                auditStore.updateKey('order', value.value)
              }
            />
          </div>
          <AuditSearchField
            onChange={(value) => {
              auditStore.updateKey('searchQuery', value);
              auditStore.updateKey('page', 1);
            }}
          />
          <div>
            <Button
              type="text"
              icon={<Icon name="grid-3x3" color="teal" />}
              className="ml-3"
              onClick={exportToCsv}
            >
              <span className="ml-2">{t('Export to CSV')}</span>
            </Button>
          </div>
        </div>
      </div>

      <AuditList />
    </div>
  ));
}

export default withPageTitle('Audit Trail - OpenReplay Preferences')(AuditView);
