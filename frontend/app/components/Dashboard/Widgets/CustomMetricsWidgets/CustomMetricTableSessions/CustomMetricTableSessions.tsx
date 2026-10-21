import { ListFooter } from '@/ui/layout/ListFooter';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Session from 'App/mstore/types/session';
import NoDataInWindow from 'Components/Dashboard/components/NoDataInWindow';

import {
  type SessionField,
  SessionsTable,
  type SessionsTableProps,
} from 'Shared/SessionsTable/SessionsTable';
import { useOpenSession } from 'Shared/SessionsTable/useOpenSession';

const FIELDS: readonly SessionField[] = [
  'started',
  'duration',
  'events',
  'location',
  'device',
];

interface Props {
  metric: any;
  isTemplate?: boolean;
  isEdit?: boolean;
  height?: number;
  data: any;
  inGrid?: boolean;
}

/** The legacy sessions table card. */
function CustomMetricTableSessions({
  isEdit = false,
  metric,
  data,
  inGrid = false,
}: Props) {
  const { t } = useTranslation();
  const { open, hover } = useOpenSession();

  const sessions = useMemo(
    () => (data?.sessions ?? []).map((s: any) => new Session().fromJson(s)),
    [data],
  );

  if (!metric || sessions.length === 0) {
    return <NoDataInWindow inGrid={inGrid} list />;
  }
  // a widget shows the first few, like the other lists
  const shown = inGrid ? sessions.slice(0, 3) : sessions;
  const total = data.total ?? sessions.length;

  return (
    <div>
      <SessionsTable
        rows={shown as unknown as SessionsTableProps['rows']}
        fields={FIELDS}
        onOpen={open}
        onHover={hover}
        stickyHeader={false}
      />
      {isEdit ? (
        <ListFooter
          page={metric.page}
          pageSize={metric.limit}
          total={data.total}
          noun={(count, n) => t('{{n}} sessions', { count, n })}
          onPage={(page) => metric.updateKey('page', page)}
        />
      ) : total > shown.length ? (
        <p className="px-6 py-3 text-xs text-content-muted">
          {t('{{shown}} of {{total}} sessions', {
            shown: shown.length,
            total: total.toLocaleString(),
          })}
        </p>
      ) : null}
    </div>
  );
}

export default observer(CustomMetricTableSessions);
