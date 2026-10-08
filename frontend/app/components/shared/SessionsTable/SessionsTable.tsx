import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { Chip } from '@/ui/data/Chip';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable } from '@/ui/data/table';
import { Tooltip } from '@/ui/overlays/tooltip';
import type Session from 'Types/session';
import {
  ListCheck,
  ListPlus,
  type LucideIcon,
  Monitor,
  Smartphone,
  SquareTerminal,
  Tablet,
} from 'lucide-react';
import type { CSSProperties, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { countries } from 'App/constants/countries';

import { SessionAvatar, hueIndexFor } from 'Shared/SessionAvatar/SessionAvatar';

import { MetaChips } from './MetaChips';
import './session-table.css';

export type SessionField =
  | 'metadata'
  | 'started'
  | 'events'
  | 'pages'
  | 'duration'
  | 'location'
  | 'device';

export const ALL_FIELDS: readonly SessionField[] = [
  'metadata',
  'started',
  'events',
  'pages',
  'duration',
  'location',
  'device',
];

export type SortColumn = 'started' | 'events' | 'duration';
export interface ColumnSort {
  column: SortColumn;
  desc: boolean;
}

const DEVICE_ICONS: Record<string, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  console: SquareTerminal,
};

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export interface SessionsTableProps {
  rows: readonly Session[];
  fields?: readonly SessionField[];
  sortable?: readonly SortColumn[];
  sort?: ColumnSort | null;
  onSort?: (next: ColumnSort | null) => void;
  onOpen: (s: Session, e: MouseEvent) => void;
  /** row under the pointer; null when it leaves */
  onHover?: (s: Session | null) => void;
  onFilterToUser?: (s: Session) => void;
  onMetaClick?: (key: string, value: string) => void;
  lastViewedId?: string | null;
  timezone?: string;
  /** "Which clock": each row in its user's own zone, when the session has one */
  userTimezone?: boolean;
  liveBadge?: boolean;
  stickyHeader?: boolean;
  /** rows that can't be opened (already picked elsewhere) */
  rowDisabled?: (s: Session) => boolean;
  /** the replay queue: given, every row offers "Add to queue" beside the play */
  queue?: {
    has: (id: string) => boolean;
    onAdd: (s: Session) => void;
    onRemove: (s: Session) => void;
  };
}

export function SessionsTable({
  rows,
  fields = ALL_FIELDS,
  sortable = [],
  sort = null,
  onSort,
  onOpen,
  onHover,
  onFilterToUser,
  onMetaClick,
  lastViewedId,
  timezone,
  userTimezone = false,
  liveBadge = true,
  stickyHeader = true,
  rowDisabled,
  queue,
}: SessionsTableProps) {
  const { t } = useTranslation();
  const has = (f: SessionField) => fields.includes(f);
  const deviceWord = (type: string) =>
    ({
      desktop: t('Desktop'),
      mobile: t('Phone'),
      tablet: t('Tablet'),
      console: t('Console'),
    })[type] ?? t('Other');

  const columns: Column<Session>[] = [
    {
      title: t('Session'),
      key: 'user',
      render: (s) => (
        <div
          className="m-ss__who"
          onMouseEnter={() => onHover?.(s)}
          onMouseLeave={() => onHover?.(null)}
        >
          <SessionAvatar seed={s.userNumericHash ?? 0} />
          {onFilterToUser ? (
            <button
              type="button"
              className={`m-ss__name m-truncate${s.userId ? '' : ' is-anon'}`}
              title={t('Show only {{name}}', { name: s.userDisplayName })}
              onClick={() => onFilterToUser(s)}
            >
              {s.userDisplayName}
            </button>
          ) : (
            <span
              className={`m-ss__name m-truncate${s.userId ? '' : ' is-anon'}`}
            >
              {s.userDisplayName}
            </span>
          )}
          {liveBadge && s.live && (
            <span className="m-ss__live">{t('live')}</span>
          )}
          {s.sessionId === lastViewedId && (
            <Chip kind="status" tone="neutral">
              {t('Last')}
            </Chip>
          )}
        </div>
      ),
    },
    ...(has('metadata')
      ? [
          {
            title: t('Metadata'),
            key: 'metadata',
            width: 176,
            render: (s: Session) => (
              <MetaChips
                metadata={s.metadata}
                onPick={onMetaClick}
                empty={<span className="m-ss__fig is-zero">—</span>}
              />
            ),
          },
        ]
      : []),
    ...(has('started')
      ? [
          {
            title: t('Started'),
            key: 'started',
            width: 112,
            sortable: sortable.includes('started'),
            render: (s: Session) => (
              <RelativeTime
                at={s.startedAt ?? 0}
                timezone={userTimezone && s.timezone ? s.timezone : timezone}
                alsoIn={
                  s.timezone
                    ? userTimezone
                      ? { label: t('Your time'), timezone: timezone ?? 'local' }
                      : { label: t("User's time"), timezone: s.timezone }
                    : undefined
                }
              />
            ),
          },
        ]
      : []),
    ...(has('events')
      ? [
          {
            title: t('Events'),
            key: 'events',
            width: 88,
            sortable: sortable.includes('events'),
            render: (s: Session) => (
              <span className="m-ss__fig">{s.eventsCount}</span>
            ),
          },
        ]
      : []),
    ...(has('pages')
      ? [
          {
            title: t('Pages'),
            key: 'pages',
            width: 88,
            render: (s: Session) => (
              <span className="m-ss__fig">{s.pagesCount}</span>
            ),
          },
        ]
      : []),
    ...(has('duration')
      ? [
          {
            title: t('Duration'),
            key: 'duration',
            width: 96,
            sortable: sortable.includes('duration'),
            render: (s: Session) => (
              <span className="m-ss__fig">
                {formatDuration(Math.round(s.duration.as('seconds')))}
              </span>
            ),
          },
        ]
      : []),
    ...(has('location')
      ? [
          {
            title: t('Location'),
            key: 'location',
            width: 144,
            render: (s: Session) => {
              const country =
                (countries as Record<string, string>)[s.userCountry] ??
                s.userCountry;
              return (
                <span
                  className="m-ss__where m-truncate"
                  title={[s.userCity, country].filter(Boolean).join(', ')}
                >
                  <span className="m-ss__cc">{s.userCountry}</span>
                  {s.userCity || country}
                </span>
              );
            },
          },
        ]
      : []),
    ...(has('device')
      ? [
          {
            title: t('Device'),
            key: 'device',
            width: 56,
            align: 'center' as const,
            render: (s: Session) => {
              const Glyph = DEVICE_ICONS[s.userDeviceType] ?? Monitor;
              const label = t('{{browser}} on {{os}} · {{device}}', {
                browser: s.userBrowser,
                os: s.userOs,
                device: deviceWord(s.userDeviceType),
              });
              return (
                <Tooltip title={label}>
                  <span className="m-ss__dev" role="img" aria-label={label}>
                    <Glyph size={15} strokeWidth={1.75} />
                  </span>
                </Tooltip>
              );
            },
          },
        ]
      : []),
    {
      title: '',
      key: 'play',
      width: queue ? 88 : 56,
      align: 'center' as const,
      className: 'm-ss__playcell',
      render: (s: Session) => {
        const queued = queue?.has(s.sessionId) ?? false;
        const label = queued ? t('Remove from queue') : t('Add to queue');
        return (
          <span className="m-ss__acts">
            {queue && (
              <Tooltip title={label}>
                <button
                  type="button"
                  className={`m-ss__queue${queued ? ' is-on' : ''}`}
                  aria-label={label}
                  aria-pressed={queued}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (queued) queue.onRemove(s);
                    else queue.onAdd(s);
                  }}
                >
                  {queued ? (
                    <ListCheck size={15} aria-hidden="true" />
                  ) : (
                    <ListPlus size={15} aria-hidden="true" />
                  )}
                </button>
              </Tooltip>
            )}
            <span className="m-ss__play">
              <OpenReplayMark variant="plain" filled={!s.viewed} />
            </span>
          </span>
        );
      },
    },
  ];

  return (
    <DataTable<Session>
      className="m-ss__table"
      ariaLabel={t('Sessions')}
      columns={columns}
      rows={rows}
      rowKey={(s) => s.sessionId}
      stickyHeader={stickyHeader}
      sort={sort ? { key: sort.column, desc: sort.desc } : null}
      onSort={(key, desc) =>
        onSort?.(key ? { column: key as SortColumn, desc } : null)
      }
      rowClassName={(s) =>
        `m-ss__row${s.viewed ? ' is-viewed' : ''}${rowDisabled?.(s) ? ' is-disabled' : ''}`
      }
      rowStyle={(s) =>
        ({
          '--m-avatar-i': hueIndexFor(s.userNumericHash ?? 0),
        }) as CSSProperties
      }
      onRowClick={(s, e) => {
        if (!rowDisabled?.(s)) onOpen(s, e);
      }}
    />
  );
}
