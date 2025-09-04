import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Loader, Pagination, NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useTranslation } from 'react-i18next';
import { session } from 'App/routes';

function ExportedVideosList() {
  const { t } = useTranslation();
  const { recordingsStore, projectsStore } = useStore();
  const loading = recordingsStore.loading;
  const list = recordingsStore.exportedVideosList;
  // const searchQuery = useObserver(() => auditStore.searchQuery);
  // const period =
  const page = recordingsStore.page;
  const order = recordingsStore.order;

  useEffect(() => {
    recordingsStore.getRecordings();
  }, []);

  const onRecOpen = (fileURL: string) => {
    window.open(fileURL, '_blank');
  }
  const onSessionOpen = (sessionId: string) => {
    const win = window.open(`${projectsStore.activeSiteId}/${session(sessionId)}`, '_blank');
    win?.focus();
  }

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
          <div className="col-span-3" />
        </div>

        {list.map((item, index) => (
          <ExportedVideo item={item} key={index} />
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

function ExportedVideo(props: any) {
  return (
    <div className="grid grid-cols-12 py-2 px-4">
      <div className="col-span-3">{t('Session')}</div>
      <div className="col-span-3">{t('Date')}</div>
      <div className="col-span-3">{t('User')}</div>
      {/* actions */}
      <div className="col-span-3" />
    </div>
  )
}

export default ExportedVideosList;
