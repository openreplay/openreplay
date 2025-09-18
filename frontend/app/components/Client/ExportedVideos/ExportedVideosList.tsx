import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Loader, Pagination, NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useTranslation } from 'react-i18next';
import { session } from 'App/routes';
import { formatDateTimeDefault } from 'App/date';
import { Switch } from 'antd';

function ExportedVideosList() {
  const { t } = useTranslation();
  const { recordingsStore, projectsStore } = useStore();
  const loading = recordingsStore.loading;
  const list = recordingsStore.exportedVideosList;
  // add later ?
  // const searchQuery = useObserver(() => auditStore.searchQuery);
  // const period =
  const page = recordingsStore.page;
  const order = recordingsStore.order;

  useEffect(() => {
    recordingsStore.getRecordings();
  }, []);

  const onRecOpen = (videoId: string) => {
    const fileURL = videoId; // TODO: req to get s3 url
    window.open(fileURL, '_blank');
  };
  const onSessionOpen = (sessionId: string) => {
    const win = window.open(
      `${projectsStore.activeSiteId}/${session(sessionId)}`,
      '_blank',
    );
    win?.focus();
  };

  return useObserver(() => (
    <Loader loading={loading}>
      <NoContent
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.NO_AUDIT_TRAIL} size={60} />
            <div className="text-center my-4">{t('No data available')}</div>
          </div>
        }
        size="small"
        show={list.length === 0}
      >
        <div className="grid grid-cols-12 py-2 px-4 font-medium">
          <div className="col-span-3">{t('Session')}</div>
          <div className="col-span-3">{t('Date')}</div>
          <div className="col-span-3">{t('User')}</div>
          {/* actions */}
          <div className="col-span-3">
            <Switch
              checked={!recordingsStore.currentUser}
              checkedChildren="Team"
              unCheckedChildren="Private"
              className="toggle-team-private"
              onChange={() =>
                recordingsStore.setCurrUser(!recordingsStore.currentUser)
              }
            />
          </div>
        </div>

        {list.map((item, index) => (
          <ExportedVideo
            item={item}
            key={index}
            onRecOpen={onRecOpen}
            onSessionOpen={onSessionOpen}
          />
        ))}

        <div className="w-full flex items-center justify-center py-10">
          <Pagination
            page={recordingsStore.page}
            total={recordingsStore.total}
            onPageChange={(page) => recordingsStore.updatePage(page)}
            limit={10}
            debounceRequest={200}
          />
        </div>
      </NoContent>
    </Loader>
  ));
}

interface VideoRow {
  sessionId: string;
  videoId: string;
  createdAt: number;
  userName: string;
}

function ExportedVideo(props: {
  item: VideoRow;
  onSessionOpen: (sessionId: string) => void;
  onRecOpen: (fileURL: string) => void;
}) {
  return (
    <div className="grid grid-cols-12 py-2 px-4">
      <div className="col-span-3">
        <div
          className="link"
          onClick={() => props.onSessionOpen(props.item.sessionId)}
        >
          {props.item.sessionId}
        </div>
      </div>
      <div className="col-span-3">
        {formatDateTimeDefault(props.item.createdAt)}
      </div>
      <div className="col-span-3">{props.item.userName || 'Unknown user'}</div>
      <div className="col-span-3 flex justify-end">
        <div
          className="link"
          onClick={() => props.onRecOpen(props.item.videoId)}
        >
          Open video
        </div>
      </div>
    </div>
  );
}

export default ExportedVideosList;
