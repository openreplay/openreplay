import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Chip } from '@/ui/data/Chip';
import { type Column, DataTable } from '@/ui/data/table';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { SimpleSelect } from '@/ui/inputs/select';
import { ListFooter } from '@/ui/layout/ListFooter';
import { TFunction } from 'i18next';
import { CloudDownload, Sheet } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  checkForRecent,
  durationFromMsFormatted,
  getDateFromMill,
} from 'App/date';
import { recordingsService } from 'App/services';
import {
  AssistStatsSession,
  SessionsResponse,
} from 'App/services/AssistStatsService';
import { useModal } from 'Components/Modal';

import PlayLink from 'Shared/SessionItem/PlayLink';

interface Props {
  onSort: (v: string) => void;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  sessions: SessionsResponse;
  exportCSV: () => void;
}

const PER_PAGE = 10;
const sortItems = (t: TFunction) => [
  { value: 'timestamp', label: t('Newest first') },
  { value: 'assist_duration', label: t('Live duration') },
  { value: 'call_duration', label: t('Call duration') },
  { value: 'control_duration', label: t('Remote duration') },
];

function Recordings({ session }: { session: AssistStatsSession }) {
  const { t } = useTranslation();
  const recs = session.recordings ?? [];
  if (!recs.length) return null;
  const icon = <CloudDownload size={14} />;
  if (recs.length === 1)
    return (
      <IconButton
        icon={icon}
        label={t('Download recording')}
        variant="ghost"
        onClick={() => recordingsService.fetchRecording(recs[0].recordId)}
      />
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span>
          <IconButton
            icon={icon}
            label={t('Download a recording')}
            variant="ghost"
          />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItems
          items={recs.map((r) => ({
            key: String(r.recordId),
            label: r.name.slice(0, 20),
            onClick: () => recordingsService.fetchRecording(r.recordId),
          }))}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatsTable({
  onSort,
  isLoading,
  onPageChange,
  page,
  sessions,
  exportCSV,
}: Props) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const [sort, setSort] = React.useState('timestamp');

  const columns: Column<AssistStatsSession>[] = [
    {
      title: t('Date'),
      key: 'date',
      width: 160,
      render: (s) => (
        <span className="text-sm text-content-secondary">
          {checkForRecent(getDateFromMill(s.timestamp)!, 'LLL dd, hh:mm a')}
        </span>
      ),
    },
    {
      title: t('Team members'),
      key: 'members',
      render: (s) => (
        <span className="flex flex-wrap gap-2">
          {s.teamMembers.map((m) => (
            <Chip key={m.name} kind="tag">
              {m.name}
            </Chip>
          ))}
        </span>
      ),
    },
    {
      title: t('Live'),
      key: 'live',
      width: 96,
      render: (s) => durationFromMsFormatted(s.assistDuration),
    },
    {
      title: t('Call'),
      key: 'call',
      width: 96,
      render: (s) => durationFromMsFormatted(s.callDuration),
    },
    {
      title: t('Remote'),
      key: 'remote',
      width: 96,
      render: (s) => durationFromMsFormatted(s.controlDuration),
    },
    {
      title: '',
      key: 'actions',
      width: 88,
      align: 'right',
      render: (s) => (
        <span className="inline-flex items-center justify-end gap-2">
          <Recordings session={s} />
          <PlayLink
            isAssist={false}
            viewed={false}
            sessionId={s.sessionId}
            onClick={hideModal}
          />
        </span>
      ),
    },
  ];

  return (
    <section className="m-astats__card">
      <header className="m-astats__card-head">
        <h3 className="m-astats__card-title">{t('Assisted sessions')}</h3>
        <SimpleSelect
          variant="subtle"
          value={sort}
          ariaLabel={t('Sort by')}
          onChange={(v) => {
            if (!v) return;
            setSort(v);
            onSort(v);
          }}
          options={sortItems(t)}
        />
        <Button disabled={sessions?.list.length === 0} onClick={exportCSV}>
          <Sheet size={13} />
          {t('Export CSV')}
        </Button>
      </header>
      {isLoading ? (
        <SkeletonRows rows={5} columns={[16, 40, 10, 10, 10, 8]} />
      ) : sessions.list.length === 0 ? (
        <p className="m-astats__none">{t('No data available')}</p>
      ) : (
        <>
          <DataTable<AssistStatsSession>
            ariaLabel={t('Assisted sessions')}
            columns={columns}
            rows={sessions.list}
            rowKey={(s) => String(s.sessionId)}
          />
          <ListFooter
            page={page}
            pageSize={PER_PAGE}
            total={sessions.total}
            noun={[t('session'), t('sessions')]}
            onPage={onPageChange}
          />
        </>
      )}
    </section>
  );
}

export default StatsTable;
