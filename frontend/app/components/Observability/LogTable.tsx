import { type Column, DataTable } from '@/ui/data/table';
import { Tooltip } from '@/ui/overlays/tooltip';
import { PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { type OtelLog, otelLogTimeMs } from 'App/services/OtelLogsService';

import {
  keyLabel,
  levelLabel,
  levelOf,
  lineStamp,
  sessionOf,
  valueOfLog,
} from './logs-logic';

export interface LogTableProps {
  rows: readonly OtelLog[];
  withDate: boolean;
  openId: string | null;
  onOpen: (log: OtelLog) => void;
  onPlay?: (log: OtelLog) => void;
  columns: readonly string[];
}

const COLUMN_WIDTH: Record<string, number> = {
  level: 88,
  service: 136,
  'res.k8s.namespace.name': 120,
  'res.k8s.pod.name': 196,
  'res.deployment.environment.name': 108,
  session: 132,
  trace: 132,
};

export function LogTable({
  rows,
  withDate,
  openId,
  onOpen,
  onPlay,
  columns: on,
}: LogTableProps) {
  const { t } = useTranslation();
  const cell = (l: OtelLog, key: string) =>
    key === 'level' ? levelLabel(t, levelOf(l)) : (valueOfLog(l, key) ?? '');

  const columns: Column<OtelLog>[] = [
    {
      title: t('Time'),
      key: 'ts',
      width: withDate ? 176 : 128,
      priority: 1,
      render: (l) => (
        <span className="m-logs__stamp">
          {lineStamp(otelLogTimeMs(l), withDate)}
        </span>
      ),
    },
    ...on.map<Column<OtelLog>>((key) => ({
      title: keyLabel(t, key),
      key,
      width: COLUMN_WIDTH[key] ?? 144,
      priority: 2,
      render: (l) => {
        const v = cell(l, key);
        return (
          <span
            className={`m-logs__cell m-truncate block${key === 'level' ? ` is-${levelOf(l)}` : ''}`}
            title={v}
          >
            {v || '-'}
          </span>
        );
      },
    })),
    {
      title: t('Message'),
      key: 'message',
      priority: 1,
      render: (l) => (
        <span className="m-logs__msg">
          <span title={l.body}>{l.body}</span>
          {onPlay && sessionOf(l) && (
            <Tooltip title={t('Watch session')}>
              <button
                type="button"
                className="m-logs__play"
                aria-label={t('Watch session')}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(l);
                }}
              >
                <PlayCircle size={14} />
              </button>
            </Tooltip>
          )}
        </span>
      ),
    },
  ];

  return (
    <DataTable<OtelLog>
      className="m-logs__table"
      rowKey={(l) => l.id}
      columns={columns}
      rows={rows}
      rowClassName={(l) =>
        `m-logs__row is-${levelOf(l)}${openId === l.id ? ' is-open' : ''}`
      }
      onRowClick={(l) => onOpen(l)}
      ariaLabel={t('Log lines')}
    />
  );
}
