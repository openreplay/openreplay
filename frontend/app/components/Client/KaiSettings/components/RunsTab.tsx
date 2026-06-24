import { Empty, Select, Skeleton, Switch } from 'antd';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FullPagination from 'Shared/FullPagination';

import { useAllRuns, useEnvironments, useTests } from '../queries';
import RunRow from './RunRow';

const LIMIT = 10;
// Tests/envs are only needed for row labels + the filter dropdown, so pull a
// generous page rather than paginating them here.
const LOOKUP_LIMIT = 100;

function RunsTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const [environmentId, setEnvironmentId] = useState<string | undefined>(
    undefined,
  );

  const { data: runsData, isPending: runsLoading } = useAllRuns({
    page,
    limit: LIMIT,
  });
  const { data: testsData } = useTests({ limit: LOOKUP_LIMIT });
  const { data: envData, isPending: envsLoading } = useEnvironments({
    limit: LOOKUP_LIMIT,
  });

  const runs = runsData?.items ?? [];
  const total = runsData?.total ?? 0;
  const tests = testsData?.items ?? [];
  const environments = envData?.items ?? [];

  // testId -> test, for resolving names and the env each run belongs to.
  const testById = useMemo(
    () => new Map(tests.map((test) => [test.testId, test])),
    [tests],
  );

  // Env / failed filters are applied client-side over the current page (the
  // runs endpoint can't filter by environment).
  const filteredRuns = runs.filter((run) => {
    if (showFailedOnly && run.status === 'passed') return false;
    if (environmentId) {
      const test = testById.get(run.testId);
      if (!test?.environments?.includes(environmentId)) return false;
    }
    return true;
  });

  const envOptions = [
    { value: '', label: t('All environments') },
    ...environments.map((env) => ({
      value: env.environmentId,
      label: env.name,
    })),
  ];

  return (
    <div>
      <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
        <Select
          size="small"
          value={environmentId ?? ''}
          onChange={(value) => {
            setEnvironmentId(value || undefined);
            setPage(1);
          }}
          options={envOptions}
          style={{ minWidth: 200 }}
          loading={envsLoading}
        />
        <div className="flex items-center gap-2">
          <Switch
            checked={showFailedOnly}
            onChange={(checked) => {
              setShowFailedOnly(checked);
              setPage(1);
            }}
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

      {runsLoading ? (
        <div className="p-4">
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ) : filteredRuns.length === 0 ? (
        <Empty
          className="py-8"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('No runs yet.')}
        />
      ) : (
        filteredRuns.map((run) => (
          <RunRow
            key={run.runId}
            run={run}
            testName={testById.get(run.testId)?.name}
          />
        ))
      )}

      {total > 0 && (
        <FullPagination
          page={page}
          limit={LIMIT}
          total={total}
          listLen={filteredRuns.length}
          onPageChange={setPage}
          entity="runs"
        />
      )}
    </div>
  );
}

export default RunsTab;
