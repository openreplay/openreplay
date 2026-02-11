import { Switch } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import RunRow from './RunRow';
import { MOCK_RUNS } from './shared/mockData';

function RunsTab() {
  const { t } = useTranslation();
  const [showFailedOnly, setShowFailedOnly] = useState(false);

  const filteredRuns = showFailedOnly
    ? MOCK_RUNS.filter((run) => run.result === 'failed')
    : MOCK_RUNS;

  return (
    <div>
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="text-sm text-disabled-text">
          {t('Showing')} {filteredRuns.length} {t('of')} {MOCK_RUNS.length}{' '}
          {t('runs')}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={showFailedOnly}
            onChange={setShowFailedOnly}
            size="small"
          />
          <span className="text-sm">{t('Show failed only')}</span>
        </div>
      </div>
      <div className="grid grid-cols-12 py-2 px-4 font-medium text-disabled-text border-b">
        <div className="col-span-1" />
        <div className="col-span-3">{t('Test Name')}</div>
        <div className="col-span-3">{t('Date')}</div>
        <div className="col-span-2">{t('Duration')}</div>
        <div className="col-span-3 text-end">{t('Result')}</div>
      </div>
      {filteredRuns.map((run) => (
        <RunRow key={run.key} run={run} />
      ))}
    </div>
  );
}

export default RunsTab;
