import { EmptyState } from '@/ui/feedback/EmptyState';
import { ListFooter } from '@/ui/layout/ListFooter';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Session from 'App/mstore/types/session';

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
}

/** The legacy sessions table card. */
function CustomMetricTableSessions({ isEdit = false, metric, data }: Props) {
  const { t } = useTranslation();
  const { open, hover } = useOpenSession();

  const sessions = useMemo(
    () => (data?.sessions ?? []).map((s: any) => new Session().fromJson(s)),
    [data],
  );

  if (!metric || sessions.length === 0) {
    return (
      <EmptyState
        art="search"
        title={t('No sessions in this period')}
        hint={t('Widen the time range or loosen the filters.')}
      />
    );
  }

  return (
    <div>
      <SessionsTable
        rows={sessions as unknown as SessionsTableProps['rows']}
        fields={FIELDS}
        onOpen={open}
        onHover={hover}
        liveBadge={false}
        stickyHeader={false}
      />
      {isEdit ? (
        <ListFooter
          page={metric.page}
          pageSize={metric.limit}
          total={data.total}
          noun={[t('session'), t('sessions')]}
          onPage={(page) => metric.updateKey('page', page)}
        />
      ) : data.total > metric.limit ? (
        <p className="px-6 py-3 text-xs text-content-muted">
          {t('{{shown}} of {{total}} sessions', {
            shown: sessions.length,
            total: data.total.toLocaleString(),
          })}
        </p>
      ) : null}
    </div>
  );
}

export default observer(CustomMetricTableSessions);
