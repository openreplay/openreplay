import React from 'react';
import { useTranslation } from 'react-i18next';

import RunRow, { RunData } from './RunRow';

const MOCK_RUNS: RunData[] = [
  {
    key: '1',
    date: 1738935120000,
    result: 'passed',
    log: 'All 3 test cases passed successfully. Login flow completed in 2.1s, dashboard loaded correctly, and user settings page rendered without errors. No critical failures detected during this run.',
  },
  {
    key: '2',
    date: 1738829700000,
    result: 'failed',
    log: 'Test case "Checkout Flow" failed at step 3: Payment form did not render within the expected timeout of 5s. The page returned a 500 error from the /api/payments endpoint. Other test cases were skipped due to critical failure threshold.',
  },
  {
    key: '3',
    date: 1738694640000,
    result: 'passed',
    log: 'All test cases completed. Login took 1.8s, product listing loaded 24 items, and the search functionality returned correct results for all 3 test queries. Session recorded successfully.',
  },
];

function RunsTab() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="grid grid-cols-12 py-2 px-4 font-medium text-disabled-text border-b">
        <div className="col-span-1" />
        <div className="col-span-5">{t('Date')}</div>
        <div className="col-span-6 text-end">{t('Result')}</div>
      </div>
      {MOCK_RUNS.map((run) => (
        <RunRow key={run.key} run={run} />
      ))}
    </div>
  );
}

export default RunsTab;
