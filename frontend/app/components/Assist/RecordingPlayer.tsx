import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { Loader } from '@/ui/feedback/Loader';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import type { IRecord } from 'App/services/RecordingsService';
import {
  ReplayIdentity,
  ReplayScreen,
} from 'Components/Session/ReplayScreen/ReplayScreen';
import 'Components/Session/ReplayScreen/replay-player.css';

import { formatDuration } from 'Shared/SessionsTable/SessionsTable';

import RecordingDialogs from './RecordingDialogs';

/** A recorded call on the replay screen: its video, and the session it was
 *  recorded in one click away. */
function RecordingPlayer({ record }: { record: IRecord }) {
  const { t } = useTranslation();
  const history = useHistory();
  const { recordingsStore, projectsStore, settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;
  const [url, setUrl] = React.useState<string | null | undefined>(undefined);
  const [renaming, setRenaming] = React.useState<IRecord | null>(null);
  const [deleting, setDeleting] = React.useState<IRecord | null>(null);

  React.useEffect(() => {
    let live = true;
    void recordingsStore
      .fetchRecordingUrl(record.recordId)
      .then((u) => live && setUrl(u ?? null));
    return () => {
      live = false;
    };
  }, [record.recordId]);

  const close = () => recordingsStore.openRecording(null);
  const openSession = () =>
    history.push(
      withSiteId(
        sessionRoute(String(record.sessionId)),
        projectsStore.getSiteId().siteId!,
      ),
    );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ReplayScreen
        className="m-recp"
        back={{ label: t('All recordings'), onClick: close }}
        lead={
          <ReplayIdentity
            seed={record.name}
            name={record.name}
            title={record.name}
            meta={
              <span className="m-truncate">
                {t('Recorded by {{name}}', { name: record.createdBy })} ·{' '}
                <RelativeTime at={record.createdAt} timezone={timezone.value} />{' '}
                · {formatDuration(Math.round(record.duration / 1000))}
              </span>
            }
          />
        }
        actions={
          <>
            {record.sessionId ? (
              <Button onClick={openSession}>
                <OpenReplayMark variant="plain" />
                {t('Open the session')}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span>
                  <IconButton
                    icon={<MoreHorizontal size={15} />}
                    label={t('More')}
                    variant="ghost"
                  />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItems
                  items={[
                    {
                      key: 'rename',
                      icon: <Pencil size={13} />,
                      label: t('Rename'),
                      onClick: () => setRenaming(record),
                    },
                    {
                      key: 'delete',
                      icon: <Trash2 size={13} />,
                      label: t('Delete'),
                      danger: true,
                      onClick: () => setDeleting(record),
                    },
                  ]}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        <section className="m-player m-recp__stage">
          {url === undefined ? (
            <Loader loading />
          ) : url === null ? (
            <EmptyState
              title={t("Couldn't load this recording")}
              hint={t('Its video is not available. Try again later.')}
            />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video className="m-recp__video" src={url} controls autoPlay />
          )}
        </section>
      </ReplayScreen>
      <RecordingDialogs
        renaming={renaming}
        deleting={deleting}
        onClose={() => {
          setRenaming(null);
          setDeleting(null);
        }}
      />
    </div>
  );
}

export default observer(RecordingPlayer);
