import withPermissions from '@/components/hocs/withPermissions';
import { IconButton } from '@/ui/actions/IconButton';
import { Chip } from '@/ui/data/Chip';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { SimpleSelect } from '@/ui/inputs/select';
import { ListFooter } from '@/ui/layout/ListFooter';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { toast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { FileDown, RotateCw, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { session } from 'App/routes';

import PreferencesPage from '../PreferencesPage';

interface VideoRow {
  sessionId: string;
  createdAt: number;
  userId: number;
  status: string;
  userName: string;
}

const TONE: Record<string, 'success' | 'danger' | 'neutral'> = {
  success: 'success',
  failure: 'danger',
};

function ExportedVideosList() {
  const { t } = useTranslation();
  const { recordingsStore, projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const { loading } = recordingsStore;
  const list: VideoRow[] = recordingsStore.exportedVideosList;
  const [deleting, setDeleting] = React.useState<VideoRow | null>(null);

  // another project starts from page 1 (its page 2 may not exist)
  const shownSite = React.useRef(siteId);
  useEffect(() => {
    const switched = shownSite.current !== siteId;
    if (switched) {
      shownSite.current = siteId;
      if (recordingsStore.page !== 1) {
        recordingsStore.setExportedVideosList([]);
        recordingsStore.updatePage(1);
        return;
      }
    }
    void recordingsStore.getRecordings(switched);
  }, [siteId, recordingsStore.page]);

  const refresh = () => {
    if (recordingsStore.page !== 1) recordingsStore.updatePage(1);
    else void recordingsStore.getRecordings();
  };

  // the tab opens inside the click (popup blockers drop one opened after an
  // await) and gets the link when it arrives
  const download = (sessionId: string) => {
    const tab = window.open('', '_blank');
    recordingsStore
      .getRecordingLink(sessionId)
      .then((url) => {
        if (tab && url) tab.location.href = url;
        else tab?.close();
      })
      .catch(() => {
        tab?.close();
        toast.error(t('Could not get the download link'));
      });
  };

  const openSession = (sessionId: string) =>
    window
      .open(
        `https://${document.location.host}/${siteId}${session(sessionId)}`,
        '_blank',
      )
      ?.focus();

  const columns: Column<VideoRow>[] = [
    {
      title: t('Session'),
      key: 'session',
      width: '34%',
      render: (r) => (
        <button
          type="button"
          className="m-mono link m-truncate"
          onClick={() => openSession(r.sessionId)}
        >
          {r.sessionId}
        </button>
      ),
    },
    {
      title: t('Exported'),
      key: 'createdAt',
      width: '18%',
      render: (r) => <RelativeTime at={r.createdAt * 1000} />,
    },
    {
      title: t('By'),
      key: 'user',
      width: '22%',
      render: (r) => (
        <span className="m-truncate">{r.userName || t('Unknown user')}</span>
      ),
    },
    {
      title: t('Status'),
      key: 'status',
      width: '14%',
      render: (r) => {
        const chip = (
          <Chip kind="status" tone={TONE[r.status] ?? 'neutral'}>
            {r.status}
          </Chip>
        );
        return r.status === 'pending' ? (
          <Tooltip
            title={t('Replay is queued for processing, check back later')}
          >
            <span>{chip}</span>
          </Tooltip>
        ) : (
          chip
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: '12%',
      align: 'right',
      render: (r) => (
        <span className="inline-flex items-center gap-1">
          {r.status === 'success' ? (
            <IconButton
              icon={<FileDown size={14} />}
              label={t('Download')}
              variant="ghost"
              onClick={() => download(r.sessionId)}
            />
          ) : null}
          <IconButton
            icon={<Trash2 size={14} />}
            label={t('Delete')}
            variant="ghost"
            onClick={() => setDeleting(r)}
          />
        </span>
      ),
    },
  ];

  return (
    <PreferencesPage
      title={t('Exported Videos')}
      flush
      actions={
        <>
          <SimpleSelect<string>
            value={siteId ? String(siteId) : undefined}
            ariaLabel={t('Project')}
            onChange={(v) => v && projectsStore.setSiteId(v)}
            options={projectsStore.list.map((p) => ({
              value: String(p.projectId),
              label: p.name,
            }))}
            className="m-pref__w-md"
          />
          <IconButton
            icon={<RotateCw size={14} />}
            label={t('Reload')}
            variant="ghost"
            onClick={refresh}
          />
        </>
      }
    >
      {loading && list.length === 0 ? (
        <SkeletonRows rows={4} columns={[34, 18, 22, 14, 12]} />
      ) : list.length === 0 ? (
        <EmptyState
          art="frame"
          title={t('No exported videos yet')}
          hint={t(
            'Export a replay to video from the player; it shows up here when it is ready.',
          )}
        />
      ) : (
        <>
          <DataTable<VideoRow>
            rowKey={(r) => r.sessionId}
            columns={columns}
            rows={list}
            ariaLabel={t('Exported videos')}
          />
          <ListFooter
            page={recordingsStore.page}
            pageSize={10}
            total={recordingsStore.total}
            noun={[t('video'), t('videos')]}
            onPage={(p) => recordingsStore.updatePage(p)}
          />
        </>
      )}
      <ConfirmDialog
        open={deleting != null}
        title={t('Delete this video?')}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(null)}
        onOk={() => {
          const r = deleting;
          setDeleting(null);
          if (!r) return;
          recordingsStore
            .deleteSessionRecording(r.sessionId)
            .then(() => recordingsStore.getRecordings())
            .catch(() => toast.error(t('Could not delete the video')));
        }}
      >
        {t('The file is removed. The session itself stays.')}
      </ConfirmDialog>
    </PreferencesPage>
  );
}

export default withPermissions(
  ['SESSION_EXPORT'],
  '',
  false,
  false,
)(observer(ExportedVideosList));
